import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, isAxiosError } from 'axios';

import { getConfig } from 'app/core/config/runtime-config';
import { getActiveCipher, isEncryptedBody, parseJsonOrText } from 'app/core/http/body-cipher';
import { readLastApiActivity, recordApiActivity } from 'app/core/session/session-storage';

export type Gateway = 'gateway' | 'vls' | 'dls';

/** How the HTTP layer reads and updates the session without importing the store (avoids an import cycle). */
export interface SessionBridge {
  getToken(): string | undefined;
  getRefreshToken(): string | undefined;
  saveTokens(tokens: { accessToken: string; refreshToken?: string }): void;
  /** Called when the session cannot be recovered (refresh disabled, idle too long, or refresh failed). */
  endSession(): void;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Do not send the session token (anonymous endpoints). */
    skipAuth?: boolean;
    /** Internal: the body is already encrypted (set on retries). */
    _bodyEncrypted?: boolean;
    /** Internal: this request was already retried after a token refresh. */
    _retriedAfterRefresh?: boolean;
  }
}

const TIMEOUT_MS = 10 * 60 * 1000;
const METHODS_WITH_BODY = new Set(['post', 'put', 'patch']);
const REFRESH_PATH = 'auth/refresh';

let bridge: SessionBridge | undefined;
const clients = new Map<Gateway, AxiosInstance>();
let refreshInFlight: Promise<string | undefined> | undefined;

/** Connects the HTTP layer to the session store. Called once at startup. */
export const connectSession = (sessionBridge: SessionBridge | undefined) => {
  bridge = sessionBridge;
};

const decryptResponseBody = async (response: AxiosResponse | undefined) => {
  const cipher = getActiveCipher();
  if (response && cipher && isEncryptedBody(response.data)) {
    response.data = parseJsonOrText(await cipher.decryptText(response.data._data));
  }
};

const isWithinIdleLimit = async () => {
  const last = await readLastApiActivity();
  // Like the legacy app, an unknown last call counts as recent activity.
  return !last || Date.now() - last.getTime() < getConfig().session.idleMinutes * 60 * 1000;
};

/** Exchanges the refresh token for a new access token. Concurrent 401s share a single refresh call. */
const refreshAccessToken = (): Promise<string | undefined> => {
  refreshInFlight ??= (async () => {
    const refreshToken = bridge?.getRefreshToken();
    if (!refreshToken) {
      return undefined;
    }
    try {
      const cipher = getActiveCipher();
      const body = { refreshToken };
      const response = await axios.post(getConfig().api.gatewayUrl + REFRESH_PATH, cipher ? { _data: await cipher.encrypt(body) } : body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS,
      });
      await decryptResponseBody(response);
      const data = response.data as { access_token?: string; refresh_token?: string };
      if (!data?.access_token) {
        return undefined;
      }
      bridge?.saveTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
      return data.access_token;
    } catch {
      return undefined;
    }
  })().finally(() => {
    refreshInFlight = undefined;
  });
  return refreshInFlight;
};

const addInterceptors = (client: AxiosInstance) => {
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = bridge?.getToken();
    if (token && !config.skipAuth && !config.headers.has('Authorization')) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    const cipher = getActiveCipher();
    if (cipher && !config._bodyEncrypted && METHODS_WITH_BODY.has((config.method ?? 'get').toLowerCase())) {
      // The gateway expects every body encrypted, including empty ones (sent as null).
      config.data = { _data: await cipher.encrypt(config.data) };
      config._bodyEncrypted = true;
    }
    return config;
  });

  client.interceptors.response.use(
    async response => {
      await decryptResponseBody(response);
      void recordApiActivity();
      return response;
    },
    async (error: unknown) => {
      if (!isAxiosError(error)) {
        throw error;
      }
      await decryptResponseBody(error.response).catch(() => undefined);
      const config = error.config;
      if (error.response?.status !== 401 || !config || config.skipAuth || config._retriedAfterRefresh) {
        throw error;
      }

      const { refreshTokenEnabled } = getConfig().session;
      const newToken = refreshTokenEnabled && (await isWithinIdleLimit()) ? await refreshAccessToken() : undefined;
      if (!newToken) {
        bridge?.endSession();
        throw error;
      }
      config._retriedAfterRefresh = true;
      config.headers.set('Authorization', `Bearer ${newToken}`);
      return client.request(config);
    },
  );
};

const baseUrlFor = (gateway: Gateway) => {
  const { api } = getConfig();
  return { gateway: api.gatewayUrl, vls: api.vlsUrl, dls: api.dlsUrl }[gateway];
};

/** The axios instance for a gateway, created on first use from the runtime config. */
export const getHttpClient = (gateway: Gateway = 'gateway'): AxiosInstance => {
  let client = clients.get(gateway);
  if (!client) {
    client = axios.create({ baseURL: baseUrlFor(gateway), timeout: TIMEOUT_MS });
    addInterceptors(client);
    clients.set(gateway, client);
  }
  return client;
};

/** Drops cached clients, e.g. after the config changed in tests. */
export const resetHttpClients = () => {
  clients.clear();
  refreshInFlight = undefined;
};
