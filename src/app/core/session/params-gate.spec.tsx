import React from 'react';
import { Route, Routes, useLocation } from 'react-router';

import { screen, waitFor } from '@testing-library/react';

import { setConfig } from 'app/core/config/runtime-config';
import { ParamsGate } from 'app/core/session/params-gate';
import { applyTestConfig, renderWithProviders } from 'app/test-utils';

const ShowLocation = () => {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
};

const renderGate = (route: string, preloadedParams: Record<string, unknown> = {}) =>
  renderWithProviders(
    <Routes>
      <Route element={<ParamsGate requiredParams={['token']} />}>
        <Route
          path="eWallet/details"
          element={
            <>
              <span>protected page</span>
              <ShowLocation />
            </>
          }
        />
      </Route>
    </Routes>,
    { route, preloadedState: { session: { params: preloadedParams } } },
  );

beforeEach(() => applyTestConfig());
afterEach(() => {
  setConfig(undefined);
  sessionStorage.clear();
});

describe('ParamsGate', () => {
  it('moves query parameters into the session and removes them from the URL', async () => {
    const { store } = renderGate('/eWallet/details?token=abc&systemCode=VLS&callbackUrl=%2Fback');

    await screen.findByText('protected page');
    expect(store.getState().session.params).toEqual({ token: 'abc', systemCode: 'VLS', callbackUrl: '/back' });
    expect(screen.getByTestId('location').textContent).toBe('/eWallet/details');
  });

  it('applies a supported language from the URL', async () => {
    const { store } = renderGate('/eWallet/details?token=abc&lang=ar');
    await waitFor(() => expect(store.getState().locale.currentLocale).toBe('ar'));
    expect(sessionStorage.getItem('locale')).toBe('"ar"');
  });

  it('ignores an unsupported language', async () => {
    const { store } = renderGate('/eWallet/details?token=abc&lang=fr');
    await screen.findByText('protected page');
    expect(store.getState().locale.currentLocale).toBe('');
    expect(store.getState().session.params.lang).toBe('fr');
  });

  it('uses the stored session when the URL has no parameters', () => {
    renderGate('/eWallet/details', { token: 'stored' });
    expect(screen.getByText('protected page')).toBeTruthy();
  });

  it('shows the error page when a required parameter is missing', async () => {
    renderGate('/eWallet/details?lang=en');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('protected page')).toBeNull();
  });
});
