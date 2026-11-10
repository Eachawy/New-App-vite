import React from 'react';

import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import AppComponent from 'app/app';
import getStore from 'app/config/store';
import { registerLocale } from 'app/config/translation';
import ErrorBoundary from 'app/shared/error/error-boundary';

const store = getStore();
// Load the translations before rendering.
await registerLocale(store);

const rootEl = document.getElementById('root');
const root = createRoot(rootEl!);

root.render(
  <ErrorBoundary>
    <Provider store={store}>
      <AppComponent />
    </Provider>
  </ErrorBoundary>,
);
