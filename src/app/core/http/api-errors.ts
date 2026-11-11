/**
 * How the gateway reports failures, and what the portal does about each kind (ported from the legacy
 * notification middleware and notificationService):
 * - business: validation errors (errorCategory 102/106) carry bilingual messages and are shown as toasts;
 * - unavailable: 503/504 send the user to the error page ("service not available");
 * - system: any other server error sends the user to the error page with its trace id;
 * - network/notFound/unauthorized are handled separately (toast, toast, session refresh).
 */
export type ApiFailure =
  | { kind: 'business'; message: { en?: string; ar?: string }; level: 'error' | 'warn' }
  | { kind: 'unavailable' }
  | { kind: 'system'; traceId?: string }
  | { kind: 'notFound' }
  | { kind: 'unauthorized' }
  | { kind: 'network' };

export interface GatewayErrorBody {
  errorCategory?: string;
  /** "ERROR" or "WARNING". */
  validationType?: string;
  messageEn?: string;
  messageAr?: string;
  systemTraceId?: string;
}

const BUSINESS_CATEGORIES = new Set(['102', '106']);

const asBody = (data: unknown): GatewayErrorBody => (typeof data === 'object' && data !== null ? (data as GatewayErrorBody) : {});

export const classifyApiFailure = (status: number, data: unknown): ApiFailure => {
  if (status === 0) {
    return { kind: 'network' };
  }
  if (status === 401) {
    return { kind: 'unauthorized' };
  }
  if (status === 503 || status === 504) {
    return { kind: 'unavailable' };
  }
  if (status === 404) {
    return { kind: 'notFound' };
  }
  const body = asBody(data);
  if (body.errorCategory && BUSINESS_CATEGORIES.has(body.errorCategory)) {
    return {
      kind: 'business',
      message: { en: body.messageEn, ar: body.messageAr },
      level: body.validationType === 'WARNING' ? 'warn' : 'error',
    };
  }
  return { kind: 'system', traceId: body.systemTraceId };
};

/** sessionStorage keys read by the error page; the same keys the legacy app uses. */
export const ERROR_PAGE_KEYS = {
  generalError: 'generalError',
  serviceNotAvailable: 'serviceNotAvailable',
  systemTraceId: 'systemTraceId',
} as const;
