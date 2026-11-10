import { translate } from 'react-jhipster';

import { setLocale } from 'app/shared/reducers/locale';
import {
  createEntitySlice,
  isFulfilledAction,
  isPendingAction,
  isRejectedAction,
  serializeAxiosError,
} from 'app/shared/reducers/reducer.utils';
import { createTestStore } from 'app/test-utils';

describe('locale', () => {
  it('loads translations once and switches the current locale', async () => {
    const store = createTestStore();
    await store.dispatch(setLocale('ar'));
    expect(store.getState().locale.currentLocale).toBe('ar');
    expect(store.getState().locale.loadedKeys).toEqual(['ar']);

    await store.dispatch(setLocale('en'));
    await store.dispatch(setLocale('ar'));
    expect(store.getState().locale.loadedKeys).toEqual(['ar', 'en']);
    expect(store.getState().locale.currentLocale).toBe('ar');
  });

  it.each([
    ['en', 'Not found', 'The page does not exist.'],
    ['ar', 'غير موجود', 'هذه الصفحة غير موجودة.'],
  ])('merges keys from every %s translation file', async (lang, fromGlobal, fromErrorFile) => {
    const store = createTestStore();
    await store.dispatch(setLocale(lang));
    // Both global.json and error.json define an "error" section; neither may overwrite the other.
    expect(translate('error.url.not.found')).toBe(fromGlobal);
    expect(translate('error.http.404')).toBe(fromErrorFile);
  });
});

describe('reducer utils', () => {
  it('recognises async action types', () => {
    expect(isPendingAction({ type: 'x/pending' })).toBe(true);
    expect(isFulfilledAction({ type: 'x/fulfilled' })).toBe(true);
    expect(isRejectedAction({ type: 'x/rejected' })).toBe(true);
    expect(isRejectedAction({ type: 'x/fulfilled' })).toBe(false);
  });

  it('serializes plain errors and primitives', () => {
    expect(serializeAxiosError(new Error('boom'))).toMatchObject({ name: 'Error', message: 'boom' });
    expect(serializeAxiosError('oops')).toEqual({ message: 'oops' });
  });

  it('keeps axios errors intact', () => {
    const axiosError = { isAxiosError: true, message: 'net' };
    expect(serializeAxiosError(axiosError)).toBe(axiosError);
  });

  it('createEntitySlice resets state and handles rejections', () => {
    const entityInitialState = { loading: false, errorMessage: null, entities: [], entity: {}, updating: false, updateSuccess: false };
    const slice = createEntitySlice({ name: 'thing', initialState: entityInitialState });
    const busy = { ...entityInitialState, loading: true, updating: true, updateSuccess: true };
    expect(slice.reducer(busy, { type: 'thing/fetch/rejected' })).toMatchObject({ loading: false, updating: false, updateSuccess: false });
    expect(slice.reducer(busy, slice.actions.reset())).toEqual(entityInitialState);
  });

  it('can skip the common rejection handling', () => {
    const entityInitialState = { loading: true, errorMessage: null, entities: [], entity: {}, updating: false, updateSuccess: false };
    const slice = createEntitySlice({ name: 'other', initialState: entityInitialState, skipRejectionHandling: true });
    expect(slice.reducer(entityInitialState, { type: 'other/fetch/rejected' }).loading).toBe(true);
  });
});
