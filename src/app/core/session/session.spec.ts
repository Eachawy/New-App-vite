import { setConfig } from 'app/core/config/runtime-config';
import { decodeClaims, resolveUserType } from 'app/core/session/claims';
import session, {
  paramRemoved,
  paramsReceived,
  selectParam,
  selectRefreshToken,
  selectToken,
  sessionCleared,
  tokensRefreshed,
} from 'app/core/session/session.reducer';
import { persistSessionChanges } from 'app/core/session/session-persistence';
import {
  LAST_ACTIVE_CALL_KEY,
  PARAMS_KEY,
  readLastApiActivity,
  readSessionValue,
  readStoredParams,
  recordApiActivity,
  writeSessionValue,
  writeStoredParams,
} from 'app/core/session/session-storage';
import { applyTestConfig, createTestStore, fakeJwt } from 'app/test-utils';

const TEST_KEY = 'dGVzdC1rZXktMTZieXRlcw==';

afterEach(() => {
  sessionStorage.clear();
  setConfig(undefined);
});

describe('session reducer', () => {
  it('stores, updates and clears parameters', () => {
    let state = session(undefined, paramsReceived({ token: 'a', lang: 'ar' }));
    state = session(state, paramsReceived({ systemCode: 'VLS' }));
    expect(state.params).toEqual({ token: 'a', lang: 'ar', systemCode: 'VLS' });
    state = session(state, paramRemoved('lang'));
    expect(state.params).toEqual({ token: 'a', systemCode: 'VLS' });
    expect(session(state, sessionCleared()).params).toEqual({});
  });

  it('replaces tokens after a refresh, keeping the old refresh token if none is returned', () => {
    let state = session(undefined, paramsReceived({ token: 'old', refresh_token: 'r1' }));
    state = session(state, tokensRefreshed({ accessToken: 'new' }));
    expect(state.params).toEqual({ token: 'new', refresh_token: 'r1' });
    state = session(state, tokensRefreshed({ accessToken: 'newer', refreshToken: 'r2' }));
    expect(state.params).toEqual({ token: 'newer', refresh_token: 'r2' });
  });

  it('selects tokens only when they are non-empty strings', () => {
    const wrap = (params: Record<string, unknown>) => ({ session: { params } });
    expect(selectToken(wrap({ token: 'abc' }))).toBe('abc');
    expect(selectToken(wrap({ token: '' }))).toBeUndefined();
    expect(selectRefreshToken(wrap({ refresh_token: 42 }))).toBeUndefined();
    expect(selectParam(wrap({ x: 1 }), 'x')).toBe(1);
  });
});

describe('session storage (legacy format)', () => {
  it('round-trips parameters without encryption as a plain entry list', async () => {
    applyTestConfig();
    await writeStoredParams({ token: 'abc', lang: 'en' });
    expect(JSON.parse(sessionStorage.getItem(PARAMS_KEY)!)).toEqual([
      ['token', 'abc'],
      ['lang', 'en'],
    ]);
    await expect(readStoredParams()).resolves.toEqual({ token: 'abc', lang: 'en' });
  });

  it('reads parameters written by the legacy app with encryption on', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    // Produced by the legacy setSessionStorage('param', ...) with crypto-js and the same test key.
    sessionStorage.setItem(PARAMS_KEY, '"3E4SLg+Vbd/yxL9CK8o2bewYZtN/XpDyezU2X5jbh7+cDK3xWowOETNbpfy/Vwti4sx94GtNqK3vWMiQBK1SQQ=="');
    await expect(readStoredParams()).resolves.toEqual({ token: 'abc.def.ghi', lang: 'ar', systemCode: 'VLS' });
  });

  it('writes encrypted parameters the legacy app can read', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    await writeStoredParams({ token: 'abc.def.ghi', lang: 'ar', systemCode: 'VLS' });
    expect(sessionStorage.getItem(PARAMS_KEY)).toBe(
      '"3E4SLg+Vbd/yxL9CK8o2bewYZtN/XpDyezU2X5jbh7+cDK3xWowOETNbpfy/Vwti4sx94GtNqK3vWMiQBK1SQQ=="',
    );
  });

  it('returns no parameters for missing, corrupt or undecryptable data', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    await expect(readStoredParams()).resolves.toEqual({});
    sessionStorage.setItem(PARAMS_KEY, '{not json');
    await expect(readStoredParams()).resolves.toEqual({});
    sessionStorage.setItem(PARAMS_KEY, '"bm90IGVuY3J5cHRlZA=="');
    await expect(readStoredParams()).resolves.toEqual({});
    sessionStorage.setItem(PARAMS_KEY, '{}');
    await expect(readStoredParams()).resolves.toEqual({});
  });

  it('records and reads the last API activity, including a legacy-written value', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    sessionStorage.setItem(LAST_ACTIVE_CALL_KEY, '"WvHNkMPhDOAvwzCq6FldECVJHiJyTTL+lr/0sbpbpHQ="');
    await expect(readLastApiActivity()).resolves.toEqual(new Date('2026-11-11T08:00:00.000Z'));

    await recordApiActivity(new Date('2026-11-11T09:30:00.000Z'));
    await expect(readLastApiActivity()).resolves.toEqual(new Date('2026-11-11T09:30:00.000Z'));
  });

  it('ignores a missing or invalid last activity', async () => {
    applyTestConfig();
    await expect(readLastApiActivity()).resolves.toBeUndefined();
    sessionStorage.setItem(LAST_ACTIVE_CALL_KEY, '"not a date"');
    await expect(readLastApiActivity()).resolves.toBeUndefined();
  });

  it('stores arbitrary values', async () => {
    applyTestConfig({ requestEncryption: { enabled: true, key: TEST_KEY } });
    await writeSessionValue('systemTraceId', 'TRACE-1');
    expect(sessionStorage.getItem('systemTraceId')).not.toContain('TRACE-1');
    await expect(readSessionValue('systemTraceId')).resolves.toBe('TRACE-1');
  });
});

describe('persistSessionChanges', () => {
  it('saves parameters when they change, and only then', async () => {
    applyTestConfig();
    const store = createTestStore();
    const unsubscribe = persistSessionChanges(store);

    store.dispatch({ type: 'unrelated' });
    expect(sessionStorage.getItem(PARAMS_KEY)).toBeNull();

    store.dispatch(paramsReceived({ token: 'abc' }));
    await vi.waitFor(() => expect(sessionStorage.getItem(PARAMS_KEY)).toBe(JSON.stringify([['token', 'abc']])));
    unsubscribe();
  });
});

describe('claims', () => {
  it.each([
    [['ROLE_VERIFIED'], undefined, 'individual'],
    [['ROLE_CORPORATE_VERIFIED'], undefined, 'corporate'],
    [['ROLE_CORPORATE_FRANCHISED'], undefined, 'corporate'],
    [['ROLE_OPEN_ACCESS'], 'INDIVIDUAL', 'individual'],
    [['ROLE_OPEN_ACCESS'], 'CORPORATE', 'corporate'],
    [['ROLE_OPEN_ACCESS'], undefined, undefined],
    [['ROLE_SOMETHING_ELSE'], undefined, undefined],
    [[], undefined, undefined],
  ])('resolves %j / %s to %s', (authorities, userType, expected) => {
    expect(resolveUserType(authorities, userType)).toBe(expected);
  });

  it('decodes the claims the portal uses', () => {
    const claims = decodeClaims(fakeJwt({ rtaUnifiedNo: 1234567, profileId: 'p1', authorities: ['ROLE_VERIFIED', 7] }));
    expect(claims).toMatchObject({ rtaUnifiedNo: '1234567', profileId: 'p1', authorities: ['ROLE_VERIFIED'], userType: 'individual' });
  });

  it('handles missing and malformed tokens', () => {
    expect(decodeClaims(undefined)).toBeUndefined();
    expect(decodeClaims('not-a-jwt')).toBeUndefined();
    expect(decodeClaims(fakeJwt({ sub: 'x' }))).toMatchObject({ authorities: [], userType: undefined, rtaUnifiedNo: undefined });
  });
});
