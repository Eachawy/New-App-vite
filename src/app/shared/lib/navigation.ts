import { useCallback } from 'react';

import { useAppSelector } from 'app/config/store';
import { type SystemCode, getConfig } from 'app/core/config/runtime-config';
import { type UserType, useClaims } from 'app/core/session/claims';
import { SESSION_KEYS, selectParams } from 'app/core/session/session.reducer';

export class RedirectNotAllowedError extends Error {}

const isHttp = (url: URL) => url.protocol === 'https:' || url.protocol === 'http:';

/**
 * Only same-origin URLs and the RTA systems listed in config.json may be redirected to.
 * Stops open redirects such as a server-supplied `journeyUrl` pointing at another site.
 */
export const isAllowedRedirect = (url: string): boolean => {
  let target: URL;
  try {
    target = new URL(url, window.location.href);
  } catch {
    return false;
  }
  if (!isHttp(target)) {
    return false;
  }
  if (target.origin === window.location.origin) {
    return true;
  }
  return Object.values(getConfig().frontendUrls).some(base => base && new URL(base, window.location.href).origin === target.origin);
};

/** Leaves the portal for `url` after checking it against the allow-list. */
export const redirectTo = (url: string) => {
  if (!isAllowedRedirect(url)) {
    throw new RedirectNotAllowedError(`Redirect to ${url} is not allowed`);
  }
  window.location.assign(url);
};

export interface HandOverContext {
  /** Session parameters (token, theme, fontSize, ...). */
  session: Record<string, unknown>;
  lang: string;
}

const asText = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined);

/**
 * Builds the URL that hands the user over to another system, carrying the session the way the
 * calling systems expect: `token` (`dls-authenticationToken` for DLS), `lang`, `theme`, `fontSize`, then `params`.
 */
export const buildHandOverUrl = (baseUrl: string, { session, lang }: HandOverContext, params: Record<string, unknown> = {}): string => {
  const url = new URL(baseUrl, window.location.href);
  const dlsBase = getConfig().frontendUrls.DLS;
  const tokenKey = dlsBase && url.href.startsWith(new URL(dlsBase, window.location.href).href) ? 'dls-authenticationToken' : 'token';

  const token = asText(session[SESSION_KEYS.token]);
  if (token) {
    url.searchParams.set(tokenKey, token);
  }
  url.searchParams.set('lang', lang);
  const theme = asText(session[SESSION_KEYS.theme]);
  if (theme) {
    url.searchParams.set('theme', theme);
  }
  const fontSize = asText(session[SESSION_KEYS.fontSize]);
  if (fontSize) {
    url.searchParams.set('fontSize', fontSize);
  }
  for (const [key, value] of Object.entries(params)) {
    const text = asText(value);
    if (text !== undefined) {
      url.searchParams.set(key, text);
    }
  }
  return url.toString();
};

/** Front-end URL of a system plus an optional path, e.g. `systemUrl('UMS', 'individual/dashboard')`. */
export const systemUrl = (system: SystemCode, path = ''): string => {
  const base = getConfig().frontendUrls[system];
  if (!base) {
    throw new Error(`No front-end URL configured for ${system}`);
  }
  return new URL(path.replace(/^\//, ''), base).toString();
};

/** The UMS dashboard for the user type (individual when unknown, like the legacy app). */
export const dashboardPath = (userType: UserType | undefined) => `${userType ?? 'individual'}/dashboard`;

/**
 * Navigation to other RTA systems with the current session. Replaces the ~10 copies of `navigateToDX`
 * and the back-to-dashboard builders in the legacy app.
 */
export const useSystemNavigation = () => {
  const session = useAppSelector(selectParams);
  const lang = useAppSelector(state => state.locale.currentLocale) || 'en';
  const claims = useClaims();

  const urlFor = useCallback(
    (system: SystemCode, path = '', params?: Record<string, unknown>) =>
      buildHandOverUrl(systemUrl(system, path), { session, lang }, params),
    [session, lang],
  );

  /** Opens `path` in another system, handing over the session. */
  const goToSystem = useCallback(
    (system: SystemCode, path = '', params?: Record<string, unknown>) => redirectTo(urlFor(system, path, params)),
    [urlFor],
  );

  const dashboardUrl = useCallback(() => urlFor('UMS', dashboardPath(claims?.userType)), [urlFor, claims?.userType]);

  /** Back to the caller: the `systemCode` front end plus `callbackUrl` received when the journey started. */
  const returnToCaller = useCallback(
    (params?: Record<string, unknown>) => {
      const system = asText(session.systemCode) as SystemCode | undefined;
      const callback = asText(session.callbackUrl) ?? asText(session.callBackUrl) ?? '';
      if (!system) {
        throw new Error('The session has no systemCode to return to');
      }
      goToSystem(system, callback, params);
    },
    [session, goToSystem],
  );

  return {
    urlFor,
    goToSystem,
    dashboardUrl,
    goToDashboard: useCallback(() => redirectTo(dashboardUrl()), [dashboardUrl]),
    returnToCaller,
  };
};
