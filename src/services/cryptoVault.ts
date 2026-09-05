/**
 * Web Crypto API Vault for Zero-Knowledge on-device encryption (AES-GCM-256 + PBKDF2)
 * Ensures user health notes and cycle records can be encrypted at rest on the device.
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM 256-bit encryption key from a user passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary text using AES-GCM-256
 */
export async function encryptText(plainText: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const enc = new TextEncoder();
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    enc.encode(plainText)
  );

  const payload = {
    v: 1,
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    data: arrayBufferToBase64(encryptedContent)
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts an encrypted payload using AES-GCM-256
 */
export async function decryptText(encryptedPayload: string, passphrase: string): Promise<string> {
  const payload = JSON.parse(encryptedPayload);
  if (!payload.salt || !payload.iv || !payload.data) {
    throw new Error('Formato de datos cifrados inválido');
  }

  const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const encryptedData = base64ToArrayBuffer(payload.data);

  const key = await deriveKey(passphrase, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encryptedData
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
