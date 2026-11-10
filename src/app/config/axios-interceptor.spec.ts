import axios from 'axios';

import setupAxiosInterceptors from 'app/config/axios-interceptor';
import { AUTHENTICATION_TOKEN_KEY } from 'app/config/constants';

describe('axios interceptors', () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  const lastHandler = (manager: unknown) => {
    const handlers = (manager as { handlers: any[] }).handlers;
    return handlers[handlers.length - 1];
  };

  it('attaches the stored token and reports 401 responses', async () => {
    const onUnauthenticated = vi.fn();
    setupAxiosInterceptors(onUnauthenticated);
    sessionStorage.setItem(AUTHENTICATION_TOKEN_KEY, JSON.stringify('abc'));

    const config = lastHandler(axios.interceptors.request).fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc');

    const { fulfilled, rejected } = lastHandler(axios.interceptors.response);
    expect(fulfilled('ok')).toBe('ok');
    await expect(rejected({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    await expect(rejected({ status: 500 })).rejects.toBeTruthy();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it('prefers a remembered token and sends no header without one', () => {
    setupAxiosInterceptors(vi.fn());
    const { fulfilled } = lastHandler(axios.interceptors.request);

    expect(fulfilled({ headers: {} }).headers.Authorization).toBeUndefined();

    localStorage.setItem(AUTHENTICATION_TOKEN_KEY, JSON.stringify('remembered'));
    sessionStorage.setItem(AUTHENTICATION_TOKEN_KEY, JSON.stringify('session'));
    expect(fulfilled({ headers: {} }).headers.Authorization).toBe('Bearer remembered');
  });
});
