import React from 'react';

import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import AppComponent from 'app/app';
import { initStore } from 'app/config/store';
import { registerLocale } from 'app/config/translation';
import { getConfig, loadConfig } from 'app/core/config/runtime-config';
import { connectSession } from 'app/core/http/http-client';
import { selectRefreshToken, selectToken, tokensRefreshed } from 'app/core/session/session.reducer';
import { persistSessionChanges } from 'app/core/session/session-persistence';
import { readStoredParams } from 'app/core/session/session-storage';
import ErrorBoundary from 'app/shared/error/error-boundary';

const root = createRoot(document.getElementById('root')!);

const showStartupError = (error: unknown) => {
  console.error(error);
  root.render(
    <div role="alert" style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>The application could not start.</h1>
      <p>Please try again later.</p>
    </div>,
  );
};

const bootstrap = async () => {
  // Environment settings first: everything below depends on them.
  await loadConfig();

  // Restore the session saved before a reload (or by the legacy portal on the same origin).
  const store = initStore({ session: { params: await readStoredParams() } });
  persistSessionChanges(store);
  connectSession({
    getToken: () => selectToken(store.getState()),
    getRefreshToken: () => selectRefreshToken(store.getState()),
    saveTokens: tokens => store.dispatch(tokensRefreshed(tokens)),
    endSession: () => window.location.assign(getConfig().session.expiredUrl),
  });

  // Load the translations before rendering.
  await registerLocale(store);

  root.render(
    <ErrorBoundary>
      <Provider store={store}>
        <AppComponent />
      </Provider>
    </ErrorBoundary>,
  );
};

bootstrap().catch(showStartupError);
