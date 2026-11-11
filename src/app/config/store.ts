import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { apiErrorMiddleware } from 'app/core/api/api-error-middleware';
import { baseApi } from 'app/core/api/base-api';
import session from 'app/core/session/session.reducer';
import sharedReducers from 'app/shared/reducers';

import errorMiddleware from './error-middleware';
import loggerMiddleware from './logger-middleware';
import notificationMiddleware from './notification-middleware';

const rootReducer = combineReducers({
  ...sharedReducers,
  session,
  [baseApi.reducerPath]: baseApi.reducer,
});

export type IRootState = ReturnType<typeof rootReducer>;

/** Creates a store. Startup passes the saved session; tests pass whatever state they need. */
export const makeStore = (preloadedState?: Partial<IRootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these field paths in all actions
          ignoredActionPaths: ['meta.arg', 'meta.baseQueryMeta', 'payload.config', 'payload.request', 'payload.headers', 'error'],
        },
      }).concat(baseApi.middleware, apiErrorMiddleware, errorMiddleware, notificationMiddleware, loggerMiddleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];

let store: AppStore | undefined;

/** Creates the app's store once, at startup. */
export const initStore = (preloadedState?: Partial<IRootState>) => {
  store = makeStore(preloadedState);
  return store;
};

/** The app's store; created empty if startup has not initialised it. */
const getStore = (): AppStore => store ?? initStore();

export const useAppSelector: TypedUseSelectorHook<IRootState> = useSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();

export default getStore;
