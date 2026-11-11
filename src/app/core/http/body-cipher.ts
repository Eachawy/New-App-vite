import { getConfig } from 'app/core/config/runtime-config';

/**
 * AES encryption of request/response bodies, byte-compatible with the legacy portal and the comgw gateway:
 * AES-CBC with PKCS#7 padding, the key doubles as the IV (first 16 bytes), payloads are base64 strings,
 * and encrypted bodies travel as `{ "_data": "<base64>" }`.
 *
 * Note: a fixed IV and a key shipped to the browser make this obfuscation rather than real confidentiality.
 * It is kept only because the gateway requires it.
 */
export interface BodyCipher {
  /** JSON-serialises `data` and encrypts it, like the legacy `encryptData`. */
  encrypt(data: unknown): Promise<string>;
  /** Decrypts a base64 payload to its UTF-8 text. */
  decryptText(payload: string): Promise<string>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

/** Creates a cipher from the base64 key used by the gateway (16, 24 or 32 bytes). */
export const createBodyCipher = (base64Key: string): BodyCipher => {
  const keyBytes = fromBase64(base64Key);
  if (![16, 24, 32].includes(keyBytes.length)) {
    throw new Error(`AES key must be 16, 24 or 32 bytes, got ${keyBytes.length}`);
  }
  // The legacy implementation passes the whole key as IV; CBC only uses its first block.
  const iv = keyBytes.slice(0, 16);
  const keyPromise = crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);

  return {
    async encrypt(data) {
      // `undefined` would not survive JSON.stringify; the legacy code sent it as null.
      const text = (JSON.stringify(data === undefined ? null : data) ?? 'null').trim();
      const cipher = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, await keyPromise, encoder.encode(text));
      return toBase64(new Uint8Array(cipher));
    },
    async decryptText(payload) {
      const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, await keyPromise, fromBase64(payload));
      return decoder.decode(plain);
    },
  };
};

/** Parses JSON, or returns the text unchanged when it is not JSON (legacy `getValidJson`). */
export const parseJsonOrText = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const isEncryptedBody = (data: unknown): data is { _data: string } =>
  typeof data === 'object' && data !== null && typeof (data as { _data?: unknown })._data === 'string';

let cached: { key: string; cipher: BodyCipher } | undefined;

/** The cipher for the current config, or `null` when request encryption is off. */
export const getActiveCipher = (): BodyCipher | null => {
  const { enabled, key } = getConfig().requestEncryption;
  if (!enabled || !key) {
    return null;
  }
  if (cached?.key !== key) {
    cached = { key, cipher: createBodyCipher(key) };
  }
  return cached.cipher;
};
