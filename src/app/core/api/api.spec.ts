import { type AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-toastify';

import { apiErrorMiddleware, openErrorPage } from 'app/core/api/api-error-middleware';
import { axiosBaseQuery, baseApi } from 'app/core/api/base-api';
import { setConfig } from 'app/core/config/runtime-config';
import { ERROR_PAGE_KEYS, classifyApiFailure } from 'app/core/http/api-errors';
import { getHttpClient, resetHttpClients } from 'app/core/http/http-client';
import { readSessionValue } from 'app/core/session/session-storage';
import { applyTestConfig, createTestStore } from 'app/test-utils';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const respond = (status: number, data?: unknown) => {
  getHttpClient().defaults.adapter = config => {
    const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse;
    return status >= 400 ? Promise.reject(new AxiosError('failed', 'ERR', config, null, response)) : Promise.resolve(response);
  };
};

const runBaseQuery = (args: Parameters<typeof axiosBaseQuery>[0]) => axiosBaseQuery(args, {} as never, {});

beforeEach(() => {
  resetHttpClients();
  applyTestConfig();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.warn).mockClear();
});

afterEach(() => {
  setConfig(undefined);
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('classifyApiFailure', () => {
  it.each([
    [0, undefined, { kind: 'network' }],
    [401, undefined, { kind: 'unauthorized' }],
    [503, undefined, { kind: 'unavailable' }],
    [504, undefined, { kind: 'unavailable' }],
    [404, undefined, { kind: 'notFound' }],
    [
      400,
      { errorCategory: '102', messageEn: 'Bad', messageAr: 'خطأ' },
      { kind: 'business', message: { en: 'Bad', ar: 'خطأ' }, level: 'error' },
    ],
    [
      400,
      { errorCategory: '106', validationType: 'WARNING', messageEn: 'Careful' },
      { kind: 'business', message: { en: 'Careful' }, level: 'warn' },
    ],
    [500, { errorCategory: '101', systemTraceId: 'T-1' }, { kind: 'system', traceId: 'T-1' }],
    [500, 'oops', { kind: 'system' }],
  ])('classifies %s %j', (status, data, expected) => {
    expect(classifyApiFailure(status, data)).toMatchObject(expected);
  });
});

describe('axiosBaseQuery', () => {
  it('returns the response data', async () => {
    respond(200, { items: [1] });
    await expect(runBaseQuery({ url: 'comgw/x', method: 'POST', data: { a: 1 } })).resolves.toEqual({ data: { items: [1] } });
  });

  it('returns HTTP failures as errors with status, body and the silent flag', async () => {
    respond(400, { errorCategory: '102' });
    await expect(runBaseQuery({ url: 'x', silent: true })).resolves.toEqual({
      error: { status: 400, data: { errorCategory: '102' }, message: 'failed', silent: true },
    });
  });

  it('reports unreachable servers as status 0', async () => {
    getHttpClient().defaults.adapter = config => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config));
    await expect(runBaseQuery({ url: 'x' })).resolves.toMatchObject({ error: { status: 0, message: 'Network Error' } });
  });

  it('turns unexpected exceptions into errors', async () => {
    getHttpClient().defaults.adapter = () => Promise.reject(new Error('boom'));
    await expect(runBaseQuery({ url: 'x' })).resolves.toMatchObject({ error: { status: 0, message: 'Error: boom' } });
  });
});

describe('API errors in the store', () => {
  const testApi = baseApi.injectEndpoints({
    endpoints: build => ({
      probe: build.query<unknown, { silent?: boolean }>({ query: ({ silent }) => ({ url: 'probe', silent }) }),
    }),
  });

  const runProbe = async (lang: string, status: number, data?: unknown, silent?: boolean) => {
    respond(status, data);
    const store = createTestStore({ locale: { currentLocale: lang, lastChange: 0, loadedKeys: [] } });
    await store.dispatch(testApi.endpoints.probe.initiate({ silent }, { forceRefetch: true }));
  };

  it('shows business errors in the current language', async () => {
    await runProbe('ar', 400, { errorCategory: '102', messageEn: 'Invalid IBAN', messageAr: 'رقم غير صالح' });
    expect(toast.error).toHaveBeenCalledWith('رقم غير صالح', expect.anything());
    await runProbe('en', 400, { errorCategory: '106', validationType: 'WARNING', messageEn: 'Check the date' });
    expect(toast.warn).toHaveBeenCalledWith('Check the date', expect.anything());
  });

  it('opens the error page for server failures', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    await runProbe('en', 500, { systemTraceId: 'TRACE-9' });
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}error`));
    await expect(readSessionValue(ERROR_PAGE_KEYS.systemTraceId)).resolves.toBe('TRACE-9');
  });

  it('stays quiet for silent calls, 404 and 401', async () => {
    await runProbe('en', 400, { errorCategory: '102', messageEn: 'x' }, true);
    await runProbe('en', 404);
    await runProbe('en', 401);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('reports an unreachable server', async () => {
    getHttpClient().defaults.adapter = config => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config));
    const store = createTestStore();
    await store.dispatch(testApi.endpoints.probe.initiate({}, { forceRefetch: true }));
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('ignores actions that are not API failures', () => {
    const next = vi.fn();
    apiErrorMiddleware({ getState: vi.fn(), dispatch: vi.fn() } as never)(next)({ type: 'other' });
    expect(next).toHaveBeenCalledWith({ type: 'other' });
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('openErrorPage', () => {
  it('records "service not available" for the error page', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    await openErrorPage({ serviceNotAvailable: true });
    await expect(readSessionValue(ERROR_PAGE_KEYS.serviceNotAvailable)).resolves.toBe('true');
    expect(assign).toHaveBeenCalledTimes(1);
  });
});
