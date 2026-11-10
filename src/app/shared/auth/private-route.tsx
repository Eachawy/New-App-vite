import React from 'react';
import { Translate } from 'react-jhipster';
import { Navigate, PathRouteProps, useLocation } from 'react-router';

import ErrorBoundary from 'app/shared/error/error-boundary';

interface IOwnProps extends PathRouteProps {
  /** True once the app knows whether a session exists; nothing is rendered before that. */
  sessionHasBeenFetched: boolean;
  isAuthenticated: boolean;
  /** Authorities of the current user. */
  authorities?: string[];
  hasAnyAuthorities?: string[];
  children: React.ReactNode;
}

const PrivateRoute = ({
  children,
  sessionHasBeenFetched,
  isAuthenticated,
  authorities = [],
  hasAnyAuthorities = [],
  ...rest
}: IOwnProps) => {
  const pageLocation = useLocation();
  const isAuthorized = hasAnyAuthority(authorities, hasAnyAuthorities);

  if (!children) {
    throw new Error(`A component needs to be specified for private route for path ${rest.path}`);
  }

  if (!sessionHasBeenFetched) {
    return <div></div>;
  }

  if (isAuthenticated) {
    if (isAuthorized) {
      return <ErrorBoundary>{children}</ErrorBoundary>;
    }

    return (
      <div className="insufficient-authority">
        <div className="alert alert-danger">
          <Translate contentKey="error.http.403">You are not authorized to access this page.</Translate>
        </div>
      </div>
    );
  }

  return (
    <Navigate
      to={{
        pathname: '/login',
        search: pageLocation.search,
      }}
      replace
      state={{ from: pageLocation }}
    />
  );
};

export const hasAnyAuthority = (authorities: string[], hasAnyAuthorities: string[]) => {
  if (authorities && authorities.length !== 0) {
    if (hasAnyAuthorities.length === 0) {
      return true;
    }
    return hasAnyAuthorities.some(auth => authorities.includes(auth));
  }
  return false;
};

/**
 * Checks authentication before showing the children and redirects to the
 * login page if the user is not authenticated.
 * If hasAnyAuthorities is provided the authorization status is also
 * checked and an error message is shown if the user is not authorized.
 */
export default PrivateRoute;
