import { ConfigError, getConfig, loadConfig, parseConfig, setConfig } from 'app/core/config/runtime-config';

const validConfig = () => ({
  environment: 'qa',
  api: { gatewayUrl: 'https://comgw.qa.test', vlsUrl: 'https://vls.qa.test/', dlsUrl: 'https://dls.qa.test/' },
  frontendUrls: { UMS: 'https://ums.qa.test', VLS: 'https://vls-app.qa.test/' },
  requestEncryption: { enabled: true, key: 'dGVzdC1rZXktMTZieXRlcw==' },
  session: { refreshTokenEnabled: false, idleMinutes: 20, expiredUrl: '/session-expired' },
  features: { newOtp: true, mahboub: false },
  googleMapsKey: '',
});

afterEach(() => setConfig(undefined));

describe('parseConfig', () => {
  it('accepts a valid config and adds trailing slashes to URLs', () => {
    const config = parseConfig(validConfig());
    expect(config.api.gatewayUrl).toBe('https://comgw.qa.test/');
    expect(config.frontendUrls.UMS).toBe('https://ums.qa.test/');
    expect(config.session).toEqual({ refreshTokenEnabled: false, idleMinutes: 20, expiredUrl: '/session-expired' });
    expect(config.requestEncryption).toEqual({ enabled: true, key: 'dGVzdC1rZXktMTZieXRlcw==' });
  });

  it.each([
    ['a non-object', 'nope', /JSON object/],
    ['a missing section', { ...validConfig(), api: undefined }, /"api" must be an object/],
    [
      'a string boolean (the legacy bug)',
      { ...validConfig(), session: { ...validConfig().session, refreshTokenEnabled: 'false' } },
      /true or false/,
    ],
    ['encryption without a key', { ...validConfig(), requestEncryption: { enabled: true } }, /key" is required/],
    ['a non-positive idle time', { ...validConfig(), session: { ...validConfig().session, idleMinutes: 0 } }, /positive number/],
    ['an empty URL', { ...validConfig(), api: { ...validConfig().api, vlsUrl: '' } }, /api.vlsUrl/],
    ['an invalid URL', { ...validConfig(), frontendUrls: { UMS: 'http://[bad' } }, /not a valid URL/],
  ])('rejects %s', (_name, raw, message) => {
    expect(() => parseConfig(raw)).toThrow(ConfigError);
    expect(() => parseConfig(raw)).toThrow(message);
  });

  it('treats an empty key as no key when encryption is off', () => {
    expect(parseConfig({ ...validConfig(), requestEncryption: { enabled: false, key: '' } }).requestEncryption).toEqual({ enabled: false });
  });
});

describe('loadConfig / getConfig', () => {
  it('loads config.json from the base path', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(validConfig()) });
    const config = await loadConfig(fetchFn as unknown as typeof fetch, '/common/');
    expect(fetchFn).toHaveBeenCalledWith('/common/config.json', { cache: 'no-store' });
    expect(getConfig()).toBe(config);
  });

  it('reports a missing file', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadConfig(fetchFn as unknown as typeof fetch, '/')).rejects.toThrow('HTTP 404');
  });

  it('refuses to be read before it is loaded', () => {
    expect(() => getConfig()).toThrow('not been loaded');
  });
});
