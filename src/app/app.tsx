import 'react-toastify/dist/ReactToastify.css';
import './app.scss';
import 'app/config/dayjs';

import React, { useEffect } from 'react';
import { Storage } from 'react-jhipster';
import { BrowserRouter } from 'react-router';
import { ToastContainer } from 'react-toastify';

import { useAppDispatch, useAppSelector } from 'app/config/store';
import AppRoutes from 'app/routes';
import ErrorBoundary from 'app/shared/error/error-boundary';
import { setLocale } from 'app/shared/reducers/locale';
import { NewRTAFooterComponent, NewRTAHeaderComponent } from 'app/shared/ui';

import { isRTL, setTextDirection } from './config/translation';

/** Router base path, e.g. "/common" (Vite's `base` without the trailing slash). */
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export const App = () => {
  const dispatch = useAppDispatch();
  const currentLocale = useAppSelector(state => state.locale.currentLocale);

  useEffect(() => {
    setTextDirection(currentLocale);
  }, [currentLocale]);

  const onLocaleChange = (langKey: string) => {
    Storage.session.set('locale', langKey);
    void dispatch(setLocale(langKey));
  };

  return (
    <BrowserRouter basename={basename}>
      <div className="app-container">
        <ToastContainer position="top-left" className="toastify-container" toastClassName="toastify-toast" />
        <ErrorBoundary>
          <NewRTAHeaderComponent currentLocale={currentLocale} onLocaleChange={onLocaleChange} isRTL={isRTL} />
        </ErrorBoundary>
        <main className="container umsPortal">
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
        <NewRTAFooterComponent currentLocale={currentLocale} />
      </div>
    </BrowserRouter>
  );
};

export default App;
