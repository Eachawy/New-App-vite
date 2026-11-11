/**
 * Temporary stand-ins for frontend-common-library 3.0.1, used until its private registry is reachable.
 * Prop interfaces are copied from the library's type definitions, so code written against these works
 * unchanged with the real components. Rendering is deliberately plain.
 */
import React from 'react';
import { Alert, Spinner } from 'react-bootstrap';

export interface ILoadinProps {
  show: boolean;
  id?: string;
  msg?: string;
  RTA?: boolean;
  title?: boolean;
}

export const LoadingComponent: React.FC<ILoadinProps> = ({ show, id, msg }) =>
  show ? (
    <div id={id} className="loading-component" role="status" aria-live="polite">
      <Spinner animation="border" size="sm" /> {msg}
    </div>
  ) : null;

export interface IButtonProps {
  children?: React.ReactNode;
  Class?: string;
  onClick: (e: any) => void;
  id?: string;
  disabled?: boolean;
  'data-UserPrivileges'?: string;
}

export const ButtonComponent: React.FC<IButtonProps> = ({ children, Class, onClick, id, disabled }) => (
  <button type="button" id={id} className={Class ?? 'btn btn-primary'} onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

export interface IInputProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onchange: (e: any) => any;
  Class?: string;
  classInfo?: any;
  titleInfo?: string;
  readOnly?: boolean;
  disabled?: boolean;
  maxLength?: string;
  minLength?: string;
  mandatory?: boolean;
  onkeypress?: (e: any) => any;
  filter?: any;
  type?: string;
  'data-UserPrivileges'?: string;
}

export const InputComponent: React.FC<IInputProps> = props => {
  const generatedId = React.useId();
  const id = props.id ?? generatedId;
  return (
    <div className={props.Class ?? 'mb-3'}>
      {props.label && (
        <label htmlFor={id} className="form-label">
          {props.label}
          {props.mandatory && <span aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={id}
        className="form-control"
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        readOnly={props.readOnly}
        disabled={props.disabled}
        maxLength={props.maxLength ? Number(props.maxLength) : undefined}
        minLength={props.minLength ? Number(props.minLength) : undefined}
        required={props.mandatory}
        onChange={props.onchange}
        onKeyDown={props.onkeypress}
      />
    </div>
  );
};

export interface IMessageProps {
  /** T_info - T_notification - T_success - T_fines [with amount] - T_violations - T_complete - T_noFoundResult */
  type?: string;
  message?: string;
  lang?: string;
  amount?: string;
  subtitle?: string;
  rejectionReasons?: any;
  rejectionReasonsTitle?: string;
  anchor?: { anchorUrl: string; anchorLbl: string; blank?: boolean };
  fireAction?: () => void;
  fireActionLbl?: string;
}

const MESSAGE_VARIANTS: Record<string, string> = {
  T_success: 'success',
  T_complete: 'success',
  T_violations: 'danger',
  T_fines: 'warning',
};

export const MessageComponent: React.FC<IMessageProps> = ({ type, message, subtitle, anchor, fireAction, fireActionLbl }) => (
  <Alert variant={(type && MESSAGE_VARIANTS[type]) ?? 'info'}>
    {message && <p className="mb-1">{message}</p>}
    {subtitle && <p className="mb-1">{subtitle}</p>}
    {anchor && (
      <a href={anchor.anchorUrl} target={anchor.blank ? '_blank' : undefined} rel={anchor.blank ? 'noopener noreferrer' : undefined}>
        {anchor.anchorLbl}
      </a>
    )}
    {fireAction && (
      <button type="button" className="btn btn-link p-0" onClick={fireAction}>
        {fireActionLbl}
      </button>
    )}
  </Alert>
);

export interface INewRTAHeaderProps {
  onLocaleChange: (e: any) => any;
  isRTL: (e: any) => any;
  account?: any;
  currentLocale: string;
  onLogOut?: () => any;
}

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', ar: 'العربية' };

export const NewRTAHeaderComponent: React.FC<INewRTAHeaderProps> = ({ onLocaleChange, account, currentLocale }) => {
  const nextLocale = currentLocale === 'ar' ? 'en' : 'ar';
  const accountName = account?.[currentLocale] as string | undefined;
  return (
    <header id="app-header" className="d-flex justify-content-between align-items-center px-3 py-2">
      <span>{accountName}</span>
      <button
        type="button"
        className="btn btn-link"
        lang={nextLocale}
        aria-label={`Switch language to ${LANGUAGE_NAMES[nextLocale]}`}
        onClick={() => onLocaleChange(nextLocale)}
      >
        {LANGUAGE_NAMES[nextLocale]}
      </button>
    </header>
  );
};

export interface IRTAFooterProps {
  currentLocale: string;
  happinessMeterURL?: any;
  mahboubURL?: any;
  showPopup?: number;
}

export const NewRTAFooterComponent: React.FC<IRTAFooterProps> = () => (
  <footer id="app-footer" className="px-3 py-2 text-muted small">
    Roads and Transport Authority
  </footer>
);
