import type { AppStore } from 'app/config/store';
import { selectParams } from 'app/core/session/session.reducer';
import { writeStoredParams } from 'app/core/session/session-storage';

/** Saves the session parameters to sessionStorage whenever they change, so a page reload keeps the session. */
export const persistSessionChanges = (store: Pick<AppStore, 'getState' | 'subscribe'>) => {
  let previous = selectParams(store.getState());
  return store.subscribe(() => {
    const current = selectParams(store.getState());
    if (current !== previous) {
      previous = current;
      void writeStoredParams(current);
    }
  });
};
