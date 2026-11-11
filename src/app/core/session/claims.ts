import { useMemo } from 'react';

import { jwtDecode } from 'jwt-decode';

import { useAppSelector } from 'app/config/store';
import { selectToken } from 'app/core/session/session.reducer';

export type UserType = 'individual' | 'corporate';

/** What the portal reads from the access token. The signature is not checked here; the gateway does that. */
export interface Claims {
  rtaUnifiedNo?: string;
  profileId?: string;
  authorities: string[];
  /** Individual or corporate, derived like the legacy `getUserType`; undefined for unknown roles. */
  userType?: UserType;
  /** Every claim in the token, for values a page needs that aren't listed above. */
  raw: Record<string, unknown>;
}

/** Derives the user type from the first authority (and the `userType` claim for open-access tokens). */
export const resolveUserType = (authorities: string[], userTypeClaim?: unknown): UserType | undefined => {
  switch (authorities[0]) {
    case 'ROLE_OPEN_ACCESS':
      if (userTypeClaim === 'INDIVIDUAL') return 'individual';
      if (userTypeClaim === 'CORPORATE') return 'corporate';
      return undefined;
    case 'ROLE_VERIFIED':
      return 'individual';
    case 'ROLE_CORPORATE_FRANCHISED':
    case 'ROLE_CORPORATE_VERIFIED':
      return 'corporate';
    default:
      return undefined;
  }
};

const optionalString = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined);

/** Decodes a token's claims; `undefined` for a missing or malformed token. */
export const decodeClaims = (token: string | undefined): Claims | undefined => {
  if (!token) {
    return undefined;
  }
  try {
    const raw = jwtDecode<Record<string, unknown>>(token);
    const authorities = Array.isArray(raw.authorities) ? raw.authorities.filter((a): a is string => typeof a === 'string') : [];
    return {
      rtaUnifiedNo: optionalString(raw.rtaUnifiedNo),
      profileId: optionalString(raw.profileId),
      authorities,
      userType: resolveUserType(authorities, raw.userType),
      raw,
    };
  } catch {
    return undefined;
  }
};

/** Claims of the current session's token. */
export const useClaims = (): Claims | undefined => {
  const token = useAppSelector(selectToken);
  return useMemo(() => decodeClaims(token), [token]);
};
