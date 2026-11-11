import './error-message.scss';

import React, { useEffect, useState } from 'react';
import { translate } from 'react-jhipster';

import { ERROR_PAGE_KEYS } from 'app/core/http/api-errors';
import { readSessionValue } from 'app/core/session/session-storage';
import { Breadcrumb } from 'app/shared/components/breadcrumb/breadcrumb';

export interface ErrorMessageProps {
  title?: string;
  description?: string;
  supportLink?: string;
  supportLinkText?: string;
}

export const ErrorMessage = ({ title, description, supportLink, supportLinkText }: ErrorMessageProps) => (
  <div className="errorComponent" role="alert">
    {title && <p className="titel">{title}</p>}
    {description && (
      <p className="des">
        {description} {supportLink && supportLinkText && <a href={supportLink}>{supportLinkText}</a>}
      </p>
    )}
  </div>
);

export interface ErrorPageProps {
  /** Translation keys for a specific error; omit to show the error recorded by the API layer. */
  titleKey?: string;
  messageKey?: string;
  supportLink?: string;
  supportLinkTextKey?: string;
}

type RecordedError = { kind: 'none' } | { kind: 'general'; traceId?: string } | { kind: 'unavailable' };

const isTrue = (value: unknown) => value === true || value === 'true';

/** Reads (and clears) the error the API layer left in sessionStorage before opening this page. */
const takeRecordedError = async (): Promise<RecordedError> => {
  const [general, unavailable, traceId] = await Promise.all([
    readSessionValue(ERROR_PAGE_KEYS.generalError),
    readSessionValue(ERROR_PAGE_KEYS.serviceNotAvailable),
    readSessionValue(ERROR_PAGE_KEYS.systemTraceId),
  ]);
  Object.values(ERROR_PAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
  if (isTrue(general)) {
    return { kind: 'general', traceId: typeof traceId === 'string' && traceId !== '' ? traceId : undefined };
  }
  if (isTrue(unavailable)) {
    return { kind: 'unavailable' };
  }
  return { kind: 'none' };
};

const recordedErrorTitle = (error: RecordedError) => {
  if (error.kind === 'unavailable') {
    return translate('common.error.notAllowedToAccessTitle');
  }
  if (error.kind === 'general' && error.traceId) {
    return translate('common.errorMSG', { error: error.traceId });
  }
  return translate('common.errorMSG1');
};

/** Shows either the given error, or the one recorded by the API layer (trace id, service unavailable). */
export const ErrorPage = ({ titleKey, messageKey, supportLink, supportLinkTextKey }: ErrorPageProps) => {
  const [recorded, setRecorded] = useState<RecordedError | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void takeRecordedError().then(error => {
      if (active) {
        setRecorded(error);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!recorded) {
    return null;
  }

  return (
    <>
      <Breadcrumb />
      {recorded.kind !== 'none' ? (
        <ErrorMessage title={recordedErrorTitle(recorded)} />
      ) : (
        <ErrorMessage
          title={translate(titleKey ?? 'common.error.someThingWrong')}
          description={translate(messageKey ?? 'common.error.someThingWrongDesc')}
          supportLink={supportLink}
          supportLinkText={supportLinkTextKey ? translate(supportLinkTextKey) : undefined}
        />
      )}
    </>
  );
};

export default ErrorPage;
