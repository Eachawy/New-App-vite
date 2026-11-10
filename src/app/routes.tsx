import React, { Suspense } from 'react';
import { Route } from 'react-router';

import Home from 'app/modules/home/home';
import ErrorBoundaryRoutes from 'app/shared/error/error-boundary-routes';

const loading = <div>loading ...</div>;

// const Account = React.lazy(() => import('app/modules/account'));

// const Admin = React.lazy(() => import('app/modules/administration'));
const AppRoutes = () => {
  return (
    <div className="view-routes">
      <Suspense fallback={loading}>
        <ErrorBoundaryRoutes>
          <Route index element={<Home />} />
        </ErrorBoundaryRoutes>
      </Suspense>
    </div>
  );
};

export default AppRoutes;
