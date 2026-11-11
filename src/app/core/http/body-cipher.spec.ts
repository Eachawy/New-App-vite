import { createBodyCipher, isEncryptedBody, parseJsonOrText } from 'app/core/http/body-cipher';

/**
 * Generated with the legacy portal's crypto-js 3.3.0 (`encryptData` logic) and test-only keys.
 * If these ever stop matching, the new app can no longer talk to the gateway.
 */
const KEYS = {
  k16: 'dGVzdC1rZXktMTZieXRlcw==',
  k32: 'dGVzdC1rZXktMzItYnl0ZXMtbG9uZy1mb3ItYWVzISE=',
};

const LEGACY_VECTORS: { key: keyof typeof KEYS; data: unknown; cipher: string }[] = [
  {
    key: 'k16',
    data: { rtaUnifiedNo: '1234567', accountNumber: 'AE070331234567890123456' },
    cipher: 'WzheEEDQu8pi24aotKstcHGZjKtdk+0vJguZMmeFhYQ5WIXWzBkf+ybrN0o9LKYs34Qhh8eUkRXlzDvtqXPSPdP0ZDkfF0w08aeFgMWCdYI=',
  },
  { key: 'k16', data: null, cipher: '6ooTmdHKHEno1faBFzJdQQ==' },
  { key: 'k16', data: 'plain text', cipher: '6osGh2Aanvxb5RDj+MQd8g==' },
  {
    key: 'k16',
    data: { ar: 'مرحبا', nested: { list: [1, 2, 3] } },
    cipher: '0gqTq5mYjSDF8L8BsbnTyLzd/O2EJuF9X52PCuImKZZ+Ow4msM7jBubu6W29Gfs0',
  },
  {
    key: 'k32',
    data: { rtaUnifiedNo: '1234567', accountNumber: 'AE070331234567890123456' },
    cipher: '+757yc89FlbCBwg+R8gWjMBid+Yvex37M8ZscUqzv8Ga3s3igxf4D4ckFI8+CyCmuHiBh+n8pQI4iOr/xRJaBkeDNNAbqfQ/UxQA32suDNU=',
  },
  { key: 'k32', data: null, cipher: 'gtG/MBxFNzAF7HBZJbmk/A==' },
  { key: 'k32', data: 'plain text', cipher: 'ZI6lQ1E9uqS2C9Dl6XzZZg==' },
  {
    key: 'k32',
    data: { ar: 'مرحبا', nested: { list: [1, 2, 3] } },
    cipher: 'DLvm5WqEH5vv8841JStKD7FSKlz7vO3KlM6qAOquze0awj4JEFd14KmKz4g71LlT',
  },
];

describe('body cipher (legacy compatibility)', () => {
  it.each(LEGACY_VECTORS)('encrypts like the legacy app ($key, $cipher)', async ({ key, data, cipher }) => {
    await expect(createBodyCipher(KEYS[key]).encrypt(data)).resolves.toBe(cipher);
  });

  it.each(LEGACY_VECTORS)('decrypts what the legacy app produced ($key, $cipher)', async ({ key, data, cipher }) => {
    await expect(createBodyCipher(KEYS[key]).decryptText(cipher)).resolves.toBe(JSON.stringify(data));
  });

  it('encrypts undefined as null, like the legacy app', async () => {
    await expect(createBodyCipher(KEYS.k16).encrypt(undefined)).resolves.toBe('6ooTmdHKHEno1faBFzJdQQ==');
  });

  it('rejects keys of the wrong length', () => {
    expect(() => createBodyCipher(btoa('short'))).toThrow(/16, 24 or 32 bytes/);
  });
});

describe('helpers', () => {
  it('parses JSON or returns the text', () => {
    expect(parseJsonOrText('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonOrText('not json')).toBe('not json');
  });

  it('recognises encrypted bodies', () => {
    expect(isEncryptedBody({ _data: 'abc' })).toBe(true);
    expect(isEncryptedBody({ data: 'abc' })).toBe(false);
    expect(isEncryptedBody(null)).toBe(false);
  });
});
