import React, { useEffect, useState } from 'react';
import { Storage } from 'react-jhipster';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from 'app/config/store';
import { paramsReceived, selectParams } from 'app/core/session/session.reducer';
import { ErrorPage } from 'app/shared/components/error-page/error-page';
import { setLocale } from 'app/shared/reducers/locale';

const SUPPORTED_LANGUAGES = new Set(['en', 'ar']);

export interface ParamsGateProps {
  /** Session parameters a page cannot work without (usually `token`); the error page shows when one is missing. */
  requiredParams?: string[];
}

/**
 * Layout route for pages opened by other RTA systems with `?token=...&lang=...&callbackUrl=...`.
 * It moves the query parameters into the session (persisted to sessionStorage), removes them from the
 * address bar so tokens don't linger in history, applies `lang`, and checks the required parameters.
 * Replaces the legacy `ParameterizedRoute`.
 */
export const ParamsGate = ({ requiredParams = [] }: ParamsGateProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const params = useAppSelector(selectParams);
  const [captured, setCaptured] = useState(location.search === '');

  useEffect(() => {
    if (location.search === '') {
      setCaptured(true);
      return;
    }
    const incoming = Object.fromEntries(new URLSearchParams(location.search));
    dispatch(paramsReceived(incoming));
    if (SUPPORTED_LANGUAGES.has(incoming.lang)) {
      Storage.session.set('locale', incoming.lang);
      void dispatch(setLocale(incoming.lang));
    }
    void navigate({ pathname: location.pathname, hash: location.hash }, { replace: true, state: location.state });
    setCaptured(true);
  }, [location.search]);

  if (!captured) {
    return null;
  }

  const missing = requiredParams.some(key => params[key] === undefined || params[key] === '');
  return missing ? (
    <ErrorPage titleKey="common.error.notAllowedToAccessTitle" messageKey="common.error.notAllowedToAccessMsg" />
  ) : (
    <Outlet />
  );
};

export default ParamsGate;
