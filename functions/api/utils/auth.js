// Native Web Crypto API JWT implementation for Cloudflare Workers/Pages
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(str) {
  // Convert UTF-8 string to binary string, then encode as base64url
  const bytes = encoder.encode(str);
  const binString = String.fromCharCode(...bytes);
  return btoa(binString).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str) {
  // Translate base64url back to base64, decode to binary string, then to UTF-8
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binString = atob(base64);
  const bytes = Uint8Array.from({ length: binString.length }, (_, i) => binString.charCodeAt(i));
  return decoder.decode(bytes);
}

/**
 * Generates a JWT signed with the HS256 algorithm.
 * @param {object} payload 
 * @param {string} secret 
 * @returns {Promise<string>} JWT token
 */
export async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  const tokenInput = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(tokenInput)
  );
  
  const encodedSignature = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
  
  return `${tokenInput}.${encodedSignature}`;
}

/**
 * Verifies a JWT token. Returns the payload if valid, otherwise null.
 * @param {string} token 
 * @param {string} secret 
 * @returns {Promise<object|null>} verified payload or null
 */
export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const tokenInput = `${encodedHeader}.${encodedPayload}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBytes = Uint8Array.from(
      base64urlDecode(encodedSignature),
      c => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(tokenInput)
    );
    
    if (!isValid) return null;
    
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    
    // Check expiration if exp field is present
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error('JWT verification error:', err);
    return null;
  }
}
