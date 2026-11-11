/**
 * Settings that differ per environment (dev, qa, tst, stg, er, prod).
 * They are loaded from `<base>/config.json` at startup, so one build can be deployed everywhere;
 * nothing environment-specific is compiled into the bundle.
 */
export type SystemCode = 'UMS' | 'VLS' | 'DLS' | 'CLS' | 'CVS' | 'COMMON' | 'SDDI' | 'RTA';

export interface AppConfig {
  /** Environment label, for display and logging only. */
  environment: string;
  api: {
    /** Main gateway (comgw/..., auth/...), with a trailing slash. */
    gatewayUrl: string;
    /** Vehicle licensing gateway, with a trailing slash. */
    vlsUrl: string;
    /** Driver licensing gateway, with a trailing slash. */
    dlsUrl: string;
  };
  /** Front-end base URL of every system the portal links to. Their origins form the redirect allow-list. */
  frontendUrls: Partial<Record<SystemCode, string>>;
  /** AES request/response body encryption required by the gateway in some environments. */
  requestEncryption: { enabled: boolean; key?: string };
  session: {
    /** Try to refresh an expired access token instead of ending the session. */
    refreshTokenEnabled: boolean;
    /** Minutes without API activity after which a 401 ends the session instead of refreshing. */
    idleMinutes: number;
    /** Where to send the user when the session has ended. */
    expiredUrl: string;
  };
  features: {
    newOtp: boolean;
    mahboub: boolean;
  };
  googleMapsKey?: string;
}

let current: AppConfig | undefined;

export class ConfigError extends Error {}

const fail = (message: string): never => {
  throw new ConfigError(`Invalid config.json: ${message}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (value: unknown, path: string, { allowEmpty = false } = {}): string => {
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    fail(`"${path}" must be a ${allowEmpty ? '' : 'non-empty '}string`);
  }
  return value as string;
};

const requireBoolean = (value: unknown, path: string): boolean => {
  // Real booleans only: the legacy app compared strings such as "false" and got it wrong.
  if (typeof value !== 'boolean') {
    fail(`"${path}" must be true or false (not a string)`);
  }
  return value as boolean;
};

const requireUrl = (value: unknown, path: string): string => {
  const url = requireString(value, path);
  if (!URL.canParse(url, 'http://placeholder.invalid')) {
    fail(`"${path}" is not a valid URL`);
  }
  return url.endsWith('/') ? url : `${url}/`;
};

const section = (raw: Record<string, unknown>, name: string): Record<string, unknown> => {
  const value = raw[name];
  if (!isRecord(value)) {
    fail(`"${name}" must be an object`);
  }
  return value as Record<string, unknown>;
};

/** Checks the shape of config.json and normalises URLs (trailing slashes). */
export const parseConfig = (raw: unknown): AppConfig => {
  if (!isRecord(raw)) {
    fail('the file must contain a JSON object');
  }
  const root = raw as Record<string, unknown>;
  const api = section(root, 'api');
  const encryption = section(root, 'requestEncryption');
  const session = section(root, 'session');
  const features = section(root, 'features');
  const frontend = section(root, 'frontendUrls');

  const enabled = requireBoolean(encryption.enabled, 'requestEncryption.enabled');
  const key = encryption.key === undefined ? undefined : requireString(encryption.key, 'requestEncryption.key', { allowEmpty: true });
  if (enabled && !key) {
    fail('"requestEncryption.key" is required when encryption is enabled');
  }

  const idleMinutes = session.idleMinutes;
  if (typeof idleMinutes !== 'number' || !Number.isFinite(idleMinutes) || idleMinutes <= 0) {
    fail('"session.idleMinutes" must be a positive number');
  }

  const frontendUrls: AppConfig['frontendUrls'] = {};
  for (const [code, url] of Object.entries(frontend)) {
    frontendUrls[code as SystemCode] = requireUrl(url, `frontendUrls.${code}`);
  }

  return {
    environment: requireString(root.environment, 'environment'),
    api: {
      gatewayUrl: requireUrl(api.gatewayUrl, 'api.gatewayUrl'),
      vlsUrl: requireUrl(api.vlsUrl, 'api.vlsUrl'),
      dlsUrl: requireUrl(api.dlsUrl, 'api.dlsUrl'),
    },
    frontendUrls,
    requestEncryption: { enabled, key: key || undefined },
    session: {
      refreshTokenEnabled: requireBoolean(session.refreshTokenEnabled, 'session.refreshTokenEnabled'),
      idleMinutes: idleMinutes as number,
      expiredUrl: requireString(session.expiredUrl, 'session.expiredUrl'),
    },
    features: {
      newOtp: requireBoolean(features.newOtp, 'features.newOtp'),
      mahboub: requireBoolean(features.mahboub, 'features.mahboub'),
    },
    googleMapsKey: root.googleMapsKey === undefined ? undefined : requireString(root.googleMapsKey, 'googleMapsKey', { allowEmpty: true }),
  };
};

/** Fetches and validates `<base>/config.json`. Call once before rendering the app. */
export const loadConfig = async (fetchFn: typeof fetch = fetch, baseUrl: string = import.meta.env.BASE_URL): Promise<AppConfig> => {
  const response = await fetchFn(`${baseUrl}config.json`, { cache: 'no-store' });
  if (!response.ok) {
    throw new ConfigError(`Could not load config.json (HTTP ${response.status})`);
  }
  current = parseConfig(await response.json());
  return current;
};

/** The loaded config. Throws if `loadConfig` (or `setConfig` in tests) has not run yet. */
export const getConfig = (): AppConfig => {
  if (!current) {
    throw new ConfigError('Config has not been loaded yet');
  }
  return current;
};

/** Replaces the active config. Intended for tests and for `loadConfig`. */
export const setConfig = (config: AppConfig | undefined) => {
  current = config;
};
