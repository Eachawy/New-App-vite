import { Storage, TranslatorContext } from 'react-jhipster';

import type { AppDispatch } from 'app/config/store';
import { setLocale } from 'app/shared/reducers/locale';

TranslatorContext.setDefaultLocale('en');
TranslatorContext.setRenderInnerTextForMissingKeys(false);

export const languages: any = {
  en: { name: 'English' },
  ar: { name: 'العربية', rtl: true },
  // jhipster-needle-i18n-language-key-pipe - JHipster will add/remove languages in this object
};

export const locales = Object.keys(languages).sort();

export const isRTL = (lang: string): boolean => Boolean(languages[lang]?.rtl);

export const setTextDirection = (lang: string) => {
  document.querySelector('html')!.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
};

export const registerLocale = (store: { dispatch: AppDispatch }): Promise<unknown> =>
  store.dispatch(setLocale(Storage.session.get('locale', 'en')));
