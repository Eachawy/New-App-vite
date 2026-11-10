import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';

import sharedReducers from 'app/shared/reducers';

const rootReducer = combineReducers(sharedReducers);

export const createTestStore = (preloadedState?: Record<string, unknown>) =>
  configureStore({ reducer: rootReducer, preloadedState: preloadedState as Partial<ReturnType<typeof rootReducer>> });

export const renderWithProviders = (
  ui: React.ReactElement,
  { preloadedState, route = '/' }: { preloadedState?: Record<string, unknown>; route?: string } = {},
) => {
  const store = createTestStore(preloadedState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  };
};
