import { translate } from 'react-jhipster';

import { type Middleware, isRejectedWithValue } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';

import type { ApiError } from 'app/core/api/base-api';
import { ERROR_PAGE_KEYS, classifyApiFailure } from 'app/core/http/api-errors';
import { writeSessionValue } from 'app/core/session/session-storage';

type StateWithLocale = { locale: { currentLocale: string } };

const TOAST_OPTIONS = { autoClose: 15000 };

/** Sends the user to the error page, leaving the details where the page (legacy or new) reads them. */
export const openErrorPage = async (details: { traceId?: string; serviceNotAvailable?: boolean }) => {
  if (details.serviceNotAvailable) {
    await writeSessionValue(ERROR_PAGE_KEYS.serviceNotAvailable, 'true');
  } else {
    await writeSessionValue(ERROR_PAGE_KEYS.generalError, 'true');
    if (details.traceId) {
      await writeSessionValue(ERROR_PAGE_KEYS.systemTraceId, details.traceId);
    }
  }
  window.location.assign(`${import.meta.env.BASE_URL}error`);
};

/**
 * Handles failed RTK Query calls the way the legacy portal did: business errors become toasts in the
 * current language, server failures open the error page. Calls made with `silent: true` are skipped.
 */
export const apiErrorMiddleware: Middleware =
  ({ getState }) =>
  next =>
  (action: unknown) => {
    if (isRejectedWithValue(action)) {
      const error = action.payload as ApiError;
      if (!error?.silent) {
        const failure = classifyApiFailure(error.status, error.data);
        const lang = (getState() as StateWithLocale).locale.currentLocale;
        switch (failure.kind) {
          case 'business': {
            const text = (lang === 'ar' ? failure.message.ar : failure.message.en) ?? failure.message.en ?? failure.message.ar ?? '';
            (failure.level === 'warn' ? toast.warn : toast.error)(text, TOAST_OPTIONS);
            break;
          }
          case 'network':
            toast.error(translate('error.server.not.reachable') ?? 'Server not reachable', TOAST_OPTIONS);
            break;
          case 'notFound':
          case 'unauthorized':
            // 404: the page shows its own empty state; 401: the HTTP layer refreshes or ends the session.
            break;
          case 'unavailable':
            void openErrorPage({ serviceNotAvailable: true });
            break;
          case 'system':
            void openErrorPage({ traceId: failure.traceId });
            break;
          default: {
            const unhandled: never = failure;
            return unhandled;
          }
        }
      }
    }
    return next(action);
  };
