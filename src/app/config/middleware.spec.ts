import { AxiosError, AxiosHeaders } from 'axios';
import { toast } from 'react-toastify';

import errorMiddleware from 'app/config/error-middleware';
import loadingBarMiddleware from 'app/config/loading-bar-middleware';
import loggerMiddleware from 'app/config/logger-middleware';
import notificationMiddleware from 'app/config/notification-middleware';
import { MESSAGE_ALERT_HEADER_NAME, MESSAGE_ERROR_HEADER_NAME } from 'app/shared/jhipster/constants';
import { ProblemWithMessageType } from 'app/shared/jhipster/problem-details';

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const run = (middleware: any, action: unknown, api: any = { dispatch: vi.fn(), getState: vi.fn() }) => {
  const next = vi.fn(a => a);
  middleware(api)(next)(action);
  return { next, api };
};

const axiosRejection = (status: number | undefined, data: unknown = {}, url = 'api/things', headers: Record<string, string> = {}) => {
  const config = { url, method: 'get', headers: new AxiosHeaders() } as any;
  const response = status === undefined ? undefined : ({ status, data, headers, config, statusText: '' } as any);
  return { type: 'things/fetch/rejected', error: new AxiosError('Request failed', 'ERR', config, null, response) };
};

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

describe('loadingBarMiddleware', () => {
  it('shows the bar on pending and hides it when the request settles', () => {
    const { api } = run(loadingBarMiddleware, { type: 'x/pending' });
    expect(api.dispatch).toHaveBeenCalledWith({ type: 'loadingBar/showLoading', payload: undefined });
    const { api: api2 } = run(loadingBarMiddleware, { type: 'x/rejected' });
    expect(api2.dispatch).toHaveBeenCalledWith({ type: 'loadingBar/hideLoading', payload: undefined });
    const { api: api3 } = run(loadingBarMiddleware, { type: 'other' });
    expect(api3.dispatch).not.toHaveBeenCalled();
  });
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
      run(errorMiddleware, {
        type: 'b/rejected',
        error: { message: 'x', response: { data: { message: 'bad', fieldErrors: [{ field: 'f', objectName: 'o', message: 'm' }] } } },
      });
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
  it('shows success toasts from alert headers', () => {
    run(notificationMiddleware, { type: 'x/fulfilled', payload: { headers: { [MESSAGE_ALERT_HEADER_NAME]: 'Saved!' } } });
    expect(toast.success).toHaveBeenCalledWith('Saved!');
    run(notificationMiddleware, { type: 'x/fulfilled', payload: { headers: { [MESSAGE_ALERT_HEADER_NAME]: 'entity.saved' } } });
    expect(toast.success).toHaveBeenCalledTimes(2);
  });

  it('ignores 401 and authentication-check failures', () => {
    run(notificationMiddleware, axiosRejection(401));
    run(notificationMiddleware, axiosRejection(500, {}, 'api/account'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each([
    ['unreachable server', axiosRejection(0)],
    ['not found', axiosRejection(404)],
    ['error header key', axiosRejection(400, {}, 'api/things', { [MESSAGE_ERROR_HEADER_NAME]: 'error.idexists' })],
    ['error header message', axiosRejection(400, {}, 'api/things', { [MESSAGE_ERROR_HEADER_NAME]: 'Bad thing!' })],
    ['problem message', axiosRejection(400, { type: ProblemWithMessageType, message: 'error.validation', detail: 'Invalid' })],
    ['plain string body', axiosRejection(500, 'Server exploded')],
    ['unknown body', axiosRejection(500, { title: 'Internal' })],
    ['network error without response', axiosRejection(undefined, {}, 'api/things')],
    ['non-axios error', { type: 'x/rejected', error: { message: 'plain' } }],
  ])('shows one error toast for %s', (_name, action) => {
    run(notificationMiddleware, action);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('shows one toast per field error', () => {
    const fieldErrors = [
      { objectName: 'thing', field: 'items[3].name', message: 'NotNull' },
      { objectName: 'thing', field: 'size', message: 'Max' },
    ];
    run(notificationMiddleware, axiosRejection(400, { type: ProblemWithMessageType, fieldErrors }));
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  it('only logs a failed GET on api/account without a response', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    run(notificationMiddleware, axiosRejection(undefined, {}, 'api/account'));
    expect(toast.error).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
