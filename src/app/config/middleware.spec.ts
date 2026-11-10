import { AxiosError, AxiosHeaders } from 'axios';
import { toast } from 'react-toastify';

import errorMiddleware from 'app/config/error-middleware';
import loggerMiddleware from 'app/config/logger-middleware';
import notificationMiddleware from 'app/config/notification-middleware';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const run = (middleware: any, action: unknown, api: any = { dispatch: vi.fn(), getState: vi.fn() }) => {
  const next = vi.fn(a => a);
  middleware(api)(next)(action);
  return { next, api };
};

const axiosRejection = (status: number | undefined, data: unknown = {}) => {
  const config = { url: 'api/things', method: 'get', headers: new AxiosHeaders() } as any;
  const response = status === undefined ? undefined : ({ status, data, headers: {}, config, statusText: '' } as any);
  return { type: 'things/fetch/rejected', error: new AxiosError('Request failed', 'ERR', config, null, response) };
};

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

describe('logger and error middleware', () => {
  it('always passes the action on', () => {
    expect(run(loggerMiddleware, { type: 'a' }).next).toHaveBeenCalledWith({ type: 'a' });
    expect(run(errorMiddleware, { type: 'b', error: { message: 'x' } }).next).toHaveBeenCalled();
  });

  it('logs details only in development', () => {
    const globals = globalThis as any;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groupSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    globals.DEVELOPMENT = true;
    try {
      run(errorMiddleware, { type: 'b/rejected', error: { message: 'x', response: { data: { message: 'bad' } } } });
      run(loggerMiddleware, { type: 'c', error: 'e' });
      expect(errorSpy).toHaveBeenCalledTimes(2);
      expect(groupSpy).toHaveBeenCalledWith('c');
    } finally {
      globals.DEVELOPMENT = false;
      vi.restoreAllMocks();
    }
  });
});

describe('notificationMiddleware', () => {
  it('leaves 401 to the session handling', () => {
    run(notificationMiddleware, axiosRejection(401));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ignores successful actions', () => {
    run(notificationMiddleware, { type: 'x/fulfilled', payload: {} });
    expect(toast.error).not.toHaveBeenCalled();
  });

  // No translations are registered in tests, so the English fallback is shown.
  it.each([
    ['unreachable server', axiosRejection(0), 'Server not reachable'],
    ['network error without response', axiosRejection(undefined), 'Server not reachable'],
    ['not found', axiosRejection(404), 'Not found'],
  ])('shows a translated toast, or its fallback, for %s', (_name, action, fallback) => {
    run(notificationMiddleware, action);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(fallback);
  });

  it.each([
    ['plain string body', axiosRejection(500, 'Server exploded'), 'Server exploded'],
    ['body with detail', axiosRejection(400, { detail: 'Invalid IBAN' }), 'Invalid IBAN'],
    ['body with title only', axiosRejection(500, { title: 'Internal' }), 'Internal'],
    ['body without message', axiosRejection(500, {}), 'Request failed'],
    ['non-axios error', { type: 'x/rejected', error: { message: 'plain' } }, 'plain'],
    ['error without message', { type: 'x/rejected', error: {} }, 'Unknown error!'],
  ])('shows the server message for %s', (_name, action, expected) => {
    run(notificationMiddleware, action);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(expected);
  });
});
