import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { render } from '@testing-library/react';

import { type IRootState, makeStore } from 'app/config/store';
import { type AppConfig, setConfig } from 'app/core/config/runtime-config';

export const createTestStore = (preloadedState?: Partial<IRootState>) => makeStore(preloadedState);

export const renderWithProviders = (
  ui: React.ReactElement,
  { preloadedState, route = '/' }: { preloadedState?: Partial<IRootState>; route?: string } = {},
) => {
  const store = createTestStore(preloadedState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
};

/** A complete config for tests; override what a test cares about. */
export const testConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  environment: 'test',
  api: { gatewayUrl: 'https://gw.test/', vlsUrl: 'https://vls.test/', dlsUrl: 'https://dls.test/' },
  frontendUrls: {
    UMS: 'https://ums.test/',
    VLS: 'https://vls-app.test/',
    DLS: 'https://dls-app.test/',
    RTA: 'https://www.rta.test/',
  },
  requestEncryption: { enabled: false },
  session: { refreshTokenEnabled: true, idleMinutes: 15, expiredUrl: '/session-expired' },
  features: { newOtp: false, mahboub: false },
  ...overrides,
});

/** Activates `testConfig(overrides)` and returns it. */
export const applyTestConfig = (overrides: Partial<AppConfig> = {}) => {
  const config = testConfig(overrides);
  setConfig(config);
  return config;
};

/** A JWT with the given claims (unsigned; the client never verifies signatures). */
export const fakeJwt = (claims: Record<string, unknown>) => {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.signature`;
};
