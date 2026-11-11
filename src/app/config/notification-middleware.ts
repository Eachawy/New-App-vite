import { translate } from 'react-jhipster';

import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import { isAxiosError } from 'axios';
import { toast } from 'react-toastify';

import { isRejectedAction } from 'app/shared/reducers/reducer.utils';

type NotificationAction = UnknownAction & {
  error?: { message?: string };
  meta?: { rejectedWithValue?: boolean; condition?: boolean };
};

/**
 * RTK Query failures are handled by the API error middleware (they are rejected "with value"),
 * and "condition" rejections are RTK skipping a duplicate request, not errors.
 */
const isHandledElsewhere = (action: NotificationAction) => Boolean(action.meta?.rejectedWithValue || action.meta?.condition);

/** Shows a translated message when a key has a translation, otherwise the fallback text. */
const showError = (fallback: string, key?: string) => {
  toast.error(key ? (translate(key) ?? fallback) : fallback);
};

const messageFromBody = (data: unknown): string | undefined => {
  if (typeof data === 'string' && data !== '') {
    return data;
  }
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    const message = body.detail ?? body.message ?? body.error ?? body.title;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};

/**
 * Turns failed async actions into error toasts.
 * 401 is left to the session handling, which redirects instead of showing a toast.
 */
const notificationMiddleware: Middleware = () => next => (rawAction: unknown) => {
  const action = rawAction as NotificationAction;
  const { error } = action;

  if (isHandledElsewhere(action)) {
    return next(action);
  }

  if (isRejectedAction(action) && isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      // Handled by the session layer.
    } else if (!error.response || status === 0) {
      showError('Server not reachable', 'error.server.not.reachable');
    } else if (status === 404) {
      showError('Not found', 'error.url.not.found');
    } else {
      showError(messageFromBody(error.response.data) ?? error.message ?? 'Unknown error!');
    }
  } else if (error) {
    showError(error.message ?? 'Unknown error!');
  }

  return next(action);
};

export default notificationMiddleware;
