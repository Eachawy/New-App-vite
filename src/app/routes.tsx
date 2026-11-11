import React, { Suspense } from 'react';
import { Route } from 'react-router';

import { ParamsGate } from 'app/core/session/params-gate';
import Home from 'app/modules/home/home';
import { ErrorPage } from 'app/shared/components/error-page/error-page';
import ErrorBoundaryRoutes from 'app/shared/error/error-boundary-routes';
import PageNotFound from 'app/shared/error/page-not-found';

const loading = <div>loading ...</div>;

const AppRoutes = () => {
  return (
    <div className="view-routes">
      <Suspense fallback={loading}>
        <ErrorBoundaryRoutes>
          <Route index element={<Home />} />
          <Route path="error" element={<ErrorPage />} />

          {/*
            Pages opened from other RTA systems go inside a ParamsGate, at their legacy paths, lazy-loaded.
            Example for phase M2:
              <Route element={<ParamsGate requiredParams={['token']} />}>
                <Route path="eWallet/ewallet-details" element={<EWalletDetailsPage />} />
              </Route>
          */}
          <Route element={<ParamsGate requiredParams={['token']} />} />

          <Route path="*" element={<PageNotFound />} />
        </ErrorBoundaryRoutes>
      </Suspense>
    </div>
  );
};

export default AppRoutes;
