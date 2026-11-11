import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { setConfig } from 'app/core/config/runtime-config';
import { createBodyCipher } from 'app/core/http/body-cipher';
import { type SessionBridge, connectSession, getHttpClient, resetHttpClients } from 'app/core/http/http-client';
import { LAST_ACTIVE_CALL_KEY } from 'app/core/session/session-storage';
import { applyTestConfig } from 'app/test-utils';

const TEST_KEY = 'dGVzdC1rZXktMTZieXRlcw==';

type Reply = { status: number; data?: unknown };
type Handler = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>;

/** Routes the client's requests to `handler` instead of the network. */
const stubAdapter = (gateway: Parameters<typeof getHttpClient>[0], handler: Handler) => {
  const seen: InternalAxiosRequestConfig[] = [];
  getHttpClient(gateway).defaults.adapter = async config => {
    seen.push(config);
    const reply = await handler(config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) {
      throw new AxiosError(`Request failed with status code ${reply.status}`, 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };
  return seen;
};

const bridge = (overrides: Partial<SessionBridge> = {}): SessionBridge => ({
  getToken: () => 'access-1',
  getRefreshToken: () => 'refresh-1',
  saveTokens: vi.fn(),
  endSession: vi.fn(),
  ...overrides,
});

const parseBody = (config: InternalAxiosRequestConfig) => (typeof config.data === 'string' ? JSON.parse(config.data) : config.data);

beforeEach(() => {
  resetHttpClients();
});

afterEach(() => {
  vi.restoreAllMocks();
  connectSession(undefined);
  sessionStorage.clear();
  setConfig(undefined);
});

describe('requests', () => {
  it('uses the configured base URL per gateway and sends the session token', async () => {
    applyTestConfig();
    connectSession(bridge());
    const seen = stubAdapter('vls', () => ({ status: 200, data: { ok: true } }));

    const response = await getHttpClient('vls').get('services/x');

    expect(response.data).toEqual({ ok: true });
    expect(seen[0].baseURL).toBe('https://vls.test/');
    expect(seen[0].headers.Authorization).toBe('Bearer access-1');
  });

  it('omits the token for anonymous calls and keeps an explicit Authorization header', async () => {
    applyTestConfig();
    connectSession(bridge());
    const seen = stubAdapter('gateway', () => ({ status: 200 }));

    await getHttpClient().post('auth/anonymous/login', {}, { skipAuth: true });
    await getHttpClient().get('x', { headers: { Authorization: 'Bearer explicit' } });

    expect(seen[0].headers.Authorization).toBeUndefined();
    expect(seen[1].headers.Authorization).toBe('Bearer explicit');
  });

  it('sends no token when there is no session', async () => {
    applyTestConfig();
    const seen = stubAdapter('gateway', () => ({ status: 200 }));
    await getHttpClient().get('x');
    expect(seen[0].headers.Authorization).toBeUndefined();
  });

  it('leaves bodies alone when encryption is off and records API activity', async () => {
    applyTestConfig();
    const seen = stubAdapter('gateway', () => ({ status: 200, data: { plain: true } }));
    const response = await getHttpClient().post('x', { a: 1 });
    expect(parseBody(seen[0])).toEqual({ a: 1 });
    expect(response.data).toEqual({ plain: true });
    await vi.waitFor(() => expect(sessionStorage.getItem(LAST_ACTIVE_CALL_KEY)).not.toBeNull());
  });
});

describe('encryption', () => {
  it('encrypts request bodies (including empty ones) and decrypts responses', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    const cipher = createBodyCipher(TEST_KEY);
    const seen = stubAdapter('gateway', async () => ({ status: 200, data: { _data: await cipher.encrypt({ balance: 120 }) } }));

    const response = await getHttpClient().post('comgw/invoice/api/get-ewallet-account', { rtaUnifiedNo: '1234567' });
    await getHttpClient().post('comgw/ums/api/profile/user-summary');
    await getHttpClient().get('comgw/x');

    expect(parseBody(seen[0])).toEqual({ _data: await cipher.encrypt({ rtaUnifiedNo: '1234567' }) });
    expect(parseBody(seen[1])).toEqual({ _data: await cipher.encrypt(null) });
    expect(seen[2].data).toBeUndefined();
    expect(response.data).toEqual({ balance: 120 });
  });

  it('decrypts error bodies so pages can read the gateway message', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    const cipher = createBodyCipher(TEST_KEY);
    stubAdapter('gateway', async () => ({
      status: 400,
      data: { _data: await cipher.encrypt({ errorCategory: '102', messageEn: 'Invalid IBAN' }) },
    }));

    const error = await getHttpClient()
      .post('x', {})
      .catch((e: AxiosError) => e);

    expect((error as AxiosError).response?.data).toEqual({ errorCategory: '102', messageEn: 'Invalid IBAN' });
  });
});

describe('expired tokens', () => {
  it('refreshes once, saves the new tokens and retries the request without re-encrypting it', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    const cipher = createBodyCipher(TEST_KEY);
    const session = bridge();
    connectSession(session);
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { _data: await cipher.encrypt({ access_token: 'access-2', refresh_token: 'refresh-2' }) },
    });
    const seen = stubAdapter('gateway', config =>
      config.headers.Authorization === 'Bearer access-2' ? { status: 200, data: 'ok' } : { status: 401 },
    );

    const response = await getHttpClient().post('comgw/x', { a: 1 });

    expect(response.data).toBe('ok');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('https://gw.test/auth/refresh');
    expect(post.mock.calls[0][1]).toEqual({ _data: await cipher.encrypt({ refreshToken: 'refresh-1' }) });
    expect(session.saveTokens).toHaveBeenCalledWith({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(parseBody(seen[1])).toEqual(parseBody(seen[0]));
    expect(session.endSession).not.toHaveBeenCalled();
  });

  it('shares one refresh between concurrent 401s', async () => {
    applyTestConfig();
    connectSession(bridge());
    let resolveRefresh: (value: unknown) => void = () => {};
    const post = vi.spyOn(axios, 'post').mockReturnValue(new Promise(resolve => (resolveRefresh = resolve)) as never);
    stubAdapter('gateway', config =>
      config.headers.Authorization === 'Bearer access-2' ? { status: 200, data: config.url } : { status: 401 },
    );

    const both = Promise.all([getHttpClient().get('a'), getHttpClient().get('b')]);
    await vi.waitFor(() => expect(post).toHaveBeenCalled());
    resolveRefresh({ data: { access_token: 'access-2' } });

    expect((await both).map(r => r.data)).toEqual(['a', 'b']);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['refresh is disabled', { session: { refreshTokenEnabled: false, idleMinutes: 15, expiredUrl: '/x' } }, () => {}],
    [
      'the user was idle too long',
      {},
      () => sessionStorage.setItem(LAST_ACTIVE_CALL_KEY, JSON.stringify(new Date(Date.now() - 16 * 60 * 1000).toISOString())),
    ],
  ])('ends the session without refreshing when %s', async (_name, overrides, arrange) => {
    applyTestConfig(overrides);
    arrange();
    const session = bridge();
    connectSession(session);
    const post = vi.spyOn(axios, 'post');
    stubAdapter('gateway', () => ({ status: 401 }));

    await expect(getHttpClient().get('x')).rejects.toBeInstanceOf(AxiosError);
    expect(post).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['there is no refresh token', bridge({ getRefreshToken: () => undefined }), undefined],
    ['the refresh call fails', bridge(), new Error('network')],
    ['the refresh returns no token', bridge(), { data: {} }],
  ])('ends the session when %s', async (_name, session, refreshResult) => {
    applyTestConfig();
    connectSession(session);
    const post = vi.spyOn(axios, 'post');
    if (refreshResult instanceof Error) {
      post.mockRejectedValue(refreshResult);
    } else {
      post.mockResolvedValue(refreshResult as never);
    }
    stubAdapter('gateway', () => ({ status: 401 }));

    await expect(getHttpClient().get('x')).rejects.toBeInstanceOf(AxiosError);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('does not loop when the retried request is rejected again', async () => {
    applyTestConfig();
    const session = bridge();
    connectSession(session);
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access_token: 'access-2' } });
    const seen = stubAdapter('gateway', () => ({ status: 401 }));

    await expect(getHttpClient().get('x')).rejects.toBeInstanceOf(AxiosError);
    expect(seen).toHaveLength(2);
  });

  it('passes other errors and anonymous 401s through untouched', async () => {
    applyTestConfig();
    const session = bridge();
    connectSession(session);
    stubAdapter('gateway', config => ({ status: config.url === 'anon' ? 401 : 500 }));

    await expect(getHttpClient().get('x')).rejects.toMatchObject({ response: { status: 500 } });
    await expect(getHttpClient().get('anon', { skipAuth: true })).rejects.toMatchObject({ response: { status: 401 } });
    expect(session.endSession).not.toHaveBeenCalled();
  });
});
