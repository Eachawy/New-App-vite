import { type BodyCipher, getActiveCipher, parseJsonOrText } from 'app/core/http/body-cipher';

/**
 * sessionStorage persistence in the legacy portal's format, so a user can move between the legacy app and this one
 * during the area-by-area rollout without losing the session:
 * - `param`: the session parameters as `[key, value][]`, AES-encrypted when request encryption is on.
 * - `last_active_call`: ISO time of the last successful API call, encrypted the same way.
 * Values are JSON-encoded, matching the `Storage.session` helper both apps use.
 */
export const PARAMS_KEY = 'param';
export const LAST_ACTIVE_CALL_KEY = 'last_active_call';

const readRaw = (key: string): unknown => {
  const stored = sessionStorage.getItem(key);
  if (stored === null) {
    return undefined;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return undefined;
  }
};

const encode = async (value: unknown, cipher: BodyCipher | null) => JSON.stringify(cipher ? await cipher.encrypt(value) : value);

const decode = async (raw: unknown, cipher: BodyCipher | null): Promise<unknown> => {
  if (cipher && typeof raw === 'string') {
    try {
      return parseJsonOrText(await cipher.decryptText(raw));
    } catch {
      return undefined;
    }
  }
  return raw;
};

const isEntryList = (value: unknown): value is [string, unknown][] =>
  Array.isArray(value) && value.every(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string');

export const readStoredParams = async (cipher = getActiveCipher()): Promise<Record<string, unknown>> => {
  const value = await decode(readRaw(PARAMS_KEY), cipher);
  return isEntryList(value) ? Object.fromEntries(value) : {};
};

export const writeStoredParams = async (params: Record<string, unknown>, cipher = getActiveCipher()) => {
  sessionStorage.setItem(PARAMS_KEY, await encode(Object.entries(params), cipher));
};

/** Stores any JSON value under `key`, encrypted like the legacy `setSessionStorage`. */
export const writeSessionValue = async (key: string, value: unknown, cipher = getActiveCipher()) => {
  sessionStorage.setItem(key, await encode(value, cipher));
};

/** Reads a value written by `writeSessionValue` (or by the legacy app). */
export const readSessionValue = async (key: string, cipher = getActiveCipher()): Promise<unknown> => decode(readRaw(key), cipher);

export const recordApiActivity = async (now = new Date(), cipher = getActiveCipher()) => {
  sessionStorage.setItem(LAST_ACTIVE_CALL_KEY, await encode(now.toISOString(), cipher));
};

/** Time of the last successful API call, or `undefined` if unknown. */
export const readLastApiActivity = async (cipher = getActiveCipher()): Promise<Date | undefined> => {
  const value = await decode(readRaw(LAST_ACTIVE_CALL_KEY), cipher);
  if (typeof value !== 'string') {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};
