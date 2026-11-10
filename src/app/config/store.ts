import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import sharedReducers from 'app/shared/reducers';

import errorMiddleware from './error-middleware';
import loggerMiddleware from './logger-middleware';
import notificationMiddleware from './notification-middleware';

const store = configureStore({
  reducer: sharedReducers,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'meta.baseQueryMeta', 'payload.config', 'payload.request', 'payload.headers', 'error'],
      },
    }).concat(errorMiddleware, notificationMiddleware, loggerMiddleware),
});

const getStore = () => store;

export type IRootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<IRootState> = useSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();

export default getStore;
