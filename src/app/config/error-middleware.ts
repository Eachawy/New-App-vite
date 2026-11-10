import type { Middleware } from '@reduxjs/toolkit';

type ErrorAction = { type: string; error?: { message?: string; response?: { data?: unknown } } };

/** Logs failed actions and the server's response body to the console. Development builds only. */
const errorMiddleware: Middleware = () => next => (rawAction: unknown) => {
  const action = rawAction as ErrorAction;
  if (DEVELOPMENT) {
    const { error } = action;
    if (error) {
      console.error(`${action.type} caught at middleware with reason: ${JSON.stringify(error.message)}.`);
      if (error.response?.data) {
        console.error('Actual cause:', error.response.data);
      }
    }
  }
  return next(action);
};

export default errorMiddleware;
