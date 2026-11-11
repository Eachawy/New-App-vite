import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

/** Parameter names shared with the calling systems and the legacy portal. */
export const SESSION_KEYS = {
  token: 'token',
  refreshToken: 'refresh_token',
  lang: 'lang',
  theme: 'theme',
  fontSize: 'fontSize',
} as const;

export interface SessionState {
  /**
   * Values handed over by the calling system in the URL (token, lang, systemCode, callbackUrl, journeyCode, ...)
   * plus values pages store for the next step of a journey.
   */
  params: Record<string, unknown>;
}

const initialState: SessionState = { params: {} };

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    paramsReceived(state, action: PayloadAction<Record<string, unknown>>) {
      Object.assign(state.params, action.payload);
    },
    paramRemoved(state, action: PayloadAction<string>) {
      delete state.params[action.payload];
    },
    tokensRefreshed(state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) {
      state.params[SESSION_KEYS.token] = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.params[SESSION_KEYS.refreshToken] = action.payload.refreshToken;
      }
    },
    sessionCleared(state) {
      state.params = {};
    },
  },
});

export const { paramsReceived, paramRemoved, tokensRefreshed, sessionCleared } = sessionSlice.actions;
export default sessionSlice.reducer;

type WithSession = { session: SessionState };

const asString = (value: unknown) => (typeof value === 'string' && value !== '' ? value : undefined);

export const selectParams = (state: WithSession) => state.session.params;
export const selectParam = (state: WithSession, key: string) => state.session.params[key];
export const selectToken = (state: WithSession) => asString(state.session.params[SESSION_KEYS.token]);
export const selectRefreshToken = (state: WithSession) => asString(state.session.params[SESSION_KEYS.refreshToken]);
