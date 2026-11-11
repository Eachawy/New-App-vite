import React from 'react';

import { Provider } from 'react-redux';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { isRTL, languages, locales, setTextDirection } from 'app/config/translation';
import Home from 'app/modules/home/home';
import ErrorBoundary from 'app/shared/error/error-boundary';
import PageNotFound from 'app/shared/error/page-not-found';
import App from 'app/app';
import { applyTestConfig, createTestStore } from 'app/test-utils';
import { renderWithProviders } from 'app/test-utils';

describe('App shell', () => {
  it('renders the header, the home page at the base path and switches language', async () => {
    applyTestConfig();
    window.history.pushState({}, '', import.meta.env.BASE_URL);
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toBeTruthy();

    const button = screen.getByRole('button', { name: /switch language/i });
    expect(button.textContent).toBe(languages.ar.name);
    fireEvent.click(button);
    await waitFor(() => expect(store.getState().locale.currentLocale).toBe('ar'));
    await waitFor(() => expect(document.documentElement.getAttribute('dir')).toBe('rtl'));
  });
});

describe('pages', () => {
  it('renders the home and not-found pages', () => {
    renderWithProviders(<Home />);
    expect(screen.getByRole('heading')).toBeTruthy();
    renderWithProviders(<PageNotFound />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('ErrorBoundary', () => {
  it('shows a fallback instead of crashing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('An unexpected error has occurred.')).toBeTruthy();
    vi.restoreAllMocks();
  });
});

describe('translation helpers', () => {
  it('knows which locales are right-to-left', () => {
    expect(locales).toEqual(['ar', 'en']);
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
    expect(isRTL('xx')).toBe(false);
    setTextDirection('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    setTextDirection('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
