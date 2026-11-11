import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { setConfig } from 'app/core/config/runtime-config';
import {
  RedirectNotAllowedError,
  buildHandOverUrl,
  dashboardPath,
  isAllowedRedirect,
  redirectTo,
  systemUrl,
  useSystemNavigation,
} from 'app/shared/lib/navigation';
import { applyTestConfig, fakeJwt, renderWithProviders } from 'app/test-utils';

const stubLocation = () => {
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, href: window.location.href, origin: window.location.origin, assign });
  return assign;
};

beforeEach(() => applyTestConfig());
afterEach(() => {
  setConfig(undefined);
  vi.unstubAllGlobals();
});

describe('redirect allow-list', () => {
  it.each([
    ['a configured system', 'https://ums.test/individual/dashboard', true],
    ['the same origin', `${window.location.origin}/common/error`, true],
    ['a relative path', '/session-expired', true],
    ['another site', 'https://evil.example/phish', false],
    ['a look-alike host', 'https://ums.test.evil.example/', false],
    ['a javascript: URL', 'javascript:alert(1)', false],
    ['a malformed URL', 'http://[bad', false],
  ])('%s → %s', (_name, url, allowed) => {
    expect(isAllowedRedirect(url)).toBe(allowed);
  });

  it('redirects only to allowed URLs', () => {
    const assign = stubLocation();
    redirectTo('https://vls-app.test/journey');
    expect(assign).toHaveBeenCalledWith('https://vls-app.test/journey');
    expect(() => redirectTo('https://evil.example/')).toThrow(RedirectNotAllowedError);
    expect(assign).toHaveBeenCalledTimes(1);
  });
});

describe('buildHandOverUrl', () => {
  const session = { token: 'abc.def', theme: 'dark', fontSize: 2 };

  it('carries token, language, theme and font size without the legacy stray space', () => {
    const url = new URL(
      buildHandOverUrl('https://vls-app.test/renew', { session, lang: 'ar' }, { deliveryType: 'STANDARD', skip: undefined }),
    );
    expect(url.searchParams.get('token')).toBe('abc.def');
    expect(url.search).not.toContain('%20');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      token: 'abc.def',
      lang: 'ar',
      theme: 'dark',
      fontSize: '2',
      deliveryType: 'STANDARD',
    });
  });

  it('uses the DLS token parameter for DLS', () => {
    const url = new URL(buildHandOverUrl('https://dls-app.test/x', { session, lang: 'en' }));
    expect(url.searchParams.get('dls-authenticationToken')).toBe('abc.def');
    expect(url.searchParams.has('token')).toBe(false);
  });

  it('skips values the session does not have', () => {
    const url = new URL(buildHandOverUrl('https://ums.test/', { session: {}, lang: 'en' }));
    expect(Object.fromEntries(url.searchParams)).toEqual({ lang: 'en' });
  });
});

describe('system URLs', () => {
  it('joins the configured base and a path', () => {
    expect(systemUrl('UMS', '/individual/dashboard')).toBe('https://ums.test/individual/dashboard');
    expect(() => systemUrl('SDDI')).toThrow('No front-end URL configured for SDDI');
  });

  it('picks the dashboard for the user type', () => {
    expect(dashboardPath('corporate')).toBe('corporate/dashboard');
    expect(dashboardPath(undefined)).toBe('individual/dashboard');
  });
});

describe('useSystemNavigation', () => {
  const Buttons = () => {
    const nav = useSystemNavigation();
    return (
      <>
        <span data-testid="dashboard">{nav.dashboardUrl()}</span>
        <button type="button" onClick={() => nav.goToDashboard()}>
          dashboard
        </button>
        <button type="button" onClick={() => nav.returnToCaller({ status: 'done' })}>
          return
        </button>
        <button type="button" onClick={() => nav.goToSystem('VLS', 'x')}>
          vls
        </button>
      </>
    );
  };

  const renderButtons = (params: Record<string, unknown>) =>
    renderWithProviders(<Buttons />, {
      preloadedState: { session: { params }, locale: { currentLocale: 'ar', lastChange: 0, loadedKeys: [] } },
    });

  it('links to the corporate dashboard for a corporate token', () => {
    renderButtons({ token: fakeJwt({ authorities: ['ROLE_CORPORATE_VERIFIED'] }) });
    const url = new URL(screen.getByTestId('dashboard').textContent!);
    expect(url.origin + url.pathname).toBe('https://ums.test/corporate/dashboard');
    expect(url.searchParams.get('lang')).toBe('ar');
  });

  it('returns to the calling system with its callback URL', () => {
    const assign = stubLocation();
    renderButtons({ token: 't', systemCode: 'VLS', callbackUrl: 'renewal/step-3' });
    fireEvent.click(screen.getByText('return'));
    const url = new URL(assign.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://vls-app.test/renewal/step-3');
    expect(url.searchParams.get('status')).toBe('done');
  });

  it('accepts the legacy callBackUrl spelling and navigates to systems and the dashboard', () => {
    const assign = stubLocation();
    renderButtons({ token: 't', systemCode: 'VLS', callBackUrl: 'legacy' });
    fireEvent.click(screen.getByText('return'));
    fireEvent.click(screen.getByText('vls'));
    fireEvent.click(screen.getByText('dashboard'));
    expect(assign.mock.calls.map(([url]) => new URL(url as string).pathname)).toEqual(['/legacy', '/x', '/individual/dashboard']);
  });
});
