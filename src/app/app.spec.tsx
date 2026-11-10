import 'app/config/dayjs';

import React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';

import setupAxiosInterceptors from 'app/config/axios-interceptor';
import { isRTL, languages, locales, setTextDirection } from 'app/config/translation';
import Home from 'app/modules/home/home';
import { DurationFormat } from 'app/shared/DurationFormat';
import ErrorBoundary from 'app/shared/error/error-boundary';
import PageNotFound from 'app/shared/error/page-not-found';
import Header from 'app/shared/layout/header/header';
import { convertDateTimeFromServer, convertDateTimeToServer, displayDefaultDateTime } from 'app/shared/util/date-utils';
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

describe('date helpers', () => {
  it('converts dates to and from the server format', () => {
    expect(convertDateTimeFromServer('2026-01-02T03:04:00')).toBe('2026-01-02T03:04');
    expect(convertDateTimeFromServer(null)).toBeNull();
    expect(convertDateTimeToServer('2026-01-02T03:04')?.year()).toBe(2026);
    expect(convertDateTimeToServer()).toBeNull();
    expect(displayDefaultDateTime()).toMatch(/T00:00$/);
  });

  it('formats durations', () => {
    render(<DurationFormat value="PT2H" locale="en" />);
    expect(screen.getByTitle('PT2H').textContent).toBe('2 hours');
    const { container } = render(<DurationFormat value="" blankOnInvalid />);
    expect(container.innerHTML).toBe('');
  });
});

describe('axios interceptors', () => {
  it('attaches the stored token and reports 401 responses', async () => {
    const onUnauthenticated = vi.fn();
    setupAxiosInterceptors(onUnauthenticated);
    sessionStorage.setItem('jhi-authenticationToken', JSON.stringify('abc'));

    const handlers = (axios.interceptors.request as any).handlers;
    const config = handlers[handlers.length - 1].fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc');

    const responseHandlers = (axios.interceptors.response as any).handlers;
    const { fulfilled, rejected } = responseHandlers[responseHandlers.length - 1];
    expect(fulfilled('ok')).toBe('ok');
    await expect(rejected({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    await expect(rejected({ status: 500 })).rejects.toBeTruthy();
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });
});
