import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { isRTL, languages, locales, setTextDirection } from 'app/config/translation';
import Home from 'app/modules/home/home';
import ErrorBoundary from 'app/shared/error/error-boundary';
import PageNotFound from 'app/shared/error/page-not-found';
import Header from 'app/shared/layout/header/header';
import { renderWithProviders } from 'app/test-utils';

describe('Header', () => {
  it('switches the language with an accessible button', async () => {
    const { store } = renderWithProviders(<Header currentLocale="en" />);
    const button = screen.getByRole('button', { name: /switch language/i });
    expect(button.textContent).toBe(languages.ar.name);
    fireEvent.click(button);
    await waitFor(() => expect(store.getState().locale.currentLocale).toBe('ar'));
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
