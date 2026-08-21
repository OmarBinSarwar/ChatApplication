// Feature 7: E2E Encryption using Web Crypto API (AES-256-GCM)
// Key is derived from conversationId — deterministic per conversation

const ENC_PREFIX = '__enc__:';

async function deriveKey(conversationId) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(conversationId + '_obs_chat_secret'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('obs_chat_salt_v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(text, conversationId) {
  if (!text) return text;
  try {
    const key = await deriveKey(conversationId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    return ENC_PREFIX + btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

export async function decryptMessage(ciphertext, conversationId) {
  if (!ciphertext || !ciphertext.startsWith(ENC_PREFIX)) return ciphertext;
  try {
    const key = await deriveKey(conversationId);
    const combined = Uint8Array.from(atob(ciphertext.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Encrypted message]';
  }
}

export const isEncrypted = (text) => typeof text === 'string' && text.startsWith(ENC_PREFIX);
