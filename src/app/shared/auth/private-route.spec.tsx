import React from 'react';
import { Route, Routes } from 'react-router';

import { screen } from '@testing-library/react';

import PrivateRoute, { hasAnyAuthority } from 'app/shared/auth/private-route';
import { renderWithProviders } from 'app/test-utils';

type AuthProps = { sessionHasBeenFetched: boolean; isAuthenticated: boolean; authorities?: string[] };

const renderGuarded = (auth: AuthProps, hasAnyAuthorities: string[] = []) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/secret"
        element={
          <PrivateRoute {...auth} hasAnyAuthorities={hasAnyAuthorities}>
            <span>secret content</span>
          </PrivateRoute>
        }
      />
      <Route path="/login" element={<span>login page</span>} />
    </Routes>,
    { route: '/secret' },
  );

describe('hasAnyAuthority', () => {
  it('returns false when the user has no authorities', () => {
    expect(hasAnyAuthority([], ['ROLE_USER'])).toBe(false);
  });

  it('returns true for any authenticated user when no authority is required', () => {
    expect(hasAnyAuthority(['ROLE_USER'], [])).toBe(true);
  });

  it('checks for at least one matching authority', () => {
    expect(hasAnyAuthority(['ROLE_USER'], ['ROLE_ADMIN', 'ROLE_USER'])).toBe(true);
    expect(hasAnyAuthority(['ROLE_USER'], ['ROLE_ADMIN'])).toBe(false);
  });
});

describe('PrivateRoute', () => {
  it('renders nothing until the session has been fetched', () => {
    renderGuarded({ sessionHasBeenFetched: false, isAuthenticated: false });
    expect(screen.queryByText('secret content')).toBeNull();
    expect(screen.queryByText('login page')).toBeNull();
  });

  it('redirects anonymous users to the login page', () => {
    renderGuarded({ sessionHasBeenFetched: true, isAuthenticated: false });
    expect(screen.getByText('login page')).toBeTruthy();
  });

  it('renders the content for an authorized user', () => {
    renderGuarded({ sessionHasBeenFetched: true, isAuthenticated: true, authorities: ['ROLE_USER'] }, ['ROLE_USER']);
    expect(screen.getByText('secret content')).toBeTruthy();
  });

  it('shows a 403 message when the user lacks the required authority', () => {
    const { container } = renderGuarded({ sessionHasBeenFetched: true, isAuthenticated: true, authorities: ['ROLE_USER'] }, ['ROLE_ADMIN']);
    expect(screen.queryByText('secret content')).toBeNull();
    expect(container.querySelector('.insufficient-authority')).not.toBeNull();
  });
});
