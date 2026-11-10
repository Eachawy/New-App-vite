/* eslint no-console: off */
import type { Middleware } from '@reduxjs/toolkit';

type LoggedAction = { type: string; payload?: unknown; meta?: unknown; error?: unknown };

const loggerMiddleware: Middleware = () => next => (action: unknown) => {
  if (DEVELOPMENT) {
    const { type, payload, meta, error } = action as LoggedAction;

    console.groupCollapsed(type);
    console.log('Payload:', payload);
    if (error) {
      console.log('Error:', error);
    }
    console.log('Meta:', meta);
    console.groupEnd();
  }

  return next(action);
};

export default loggerMiddleware;
