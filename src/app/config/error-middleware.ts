import type { Middleware } from '@reduxjs/toolkit';

import type { FieldErrorVM } from 'app/shared/jhipster/problem-details';

type ErrorData = { message?: string; fieldErrors?: FieldErrorVM[] };
type ErrorAction = { type: string; error?: { message?: string; response?: { data?: ErrorData } } };

const getErrorMessage = (errorData: ErrorData) => {
  let { message } = errorData;
  if (errorData.fieldErrors) {
    errorData.fieldErrors.forEach((fErr: FieldErrorVM) => {
      message += `\nfield: ${fErr.field}, Object: ${fErr.objectName}, message: ${fErr.message}\n`;
    });
  }
  return message;
};

const errorMiddleware: Middleware = () => next => (rawAction: unknown) => {
  const action = rawAction as ErrorAction;
  /**
   *
   * The error middleware serves to log error messages from dispatch
   * It need not run in production
   */
  if (DEVELOPMENT) {
    const { error } = action;
    if (error) {
      console.error(`${action.type} caught at middleware with reason: ${JSON.stringify(error.message)}.`);
      if (error.response?.data) {
        const message = getErrorMessage(error.response.data);
        console.error(`Actual cause: ${message}`);
      }
    }
  }
  // Dispatch initial action
  return next(action);
};

export default errorMiddleware;
