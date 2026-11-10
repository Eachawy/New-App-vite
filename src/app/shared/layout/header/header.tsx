import React from 'react';
import { Storage } from 'react-jhipster';

import { useAppDispatch } from 'app/config/store';
import { languages } from 'app/config/translation';
import { setLocale } from 'app/shared/reducers/locale';

export interface IHeaderProps {
  currentLocale: string;
}

const Header = ({ currentLocale }: IHeaderProps) => {
  const dispatch = useAppDispatch();

  const nextLocale = currentLocale === 'en' ? 'ar' : 'en';

  const handleLocaleChange = (langKey: string) => {
    Storage.session.set('locale', langKey);
    void dispatch(setLocale(langKey));
  };

  return (
    <div id="app-header">
      <button
        type="button"
        className="btn btn-link"
        lang={nextLocale}
        aria-label={`Switch language to ${languages[nextLocale]?.name ?? nextLocale}`}
        onClick={() => handleLocaleChange(nextLocale)}
      >
        {languages[nextLocale]?.name ?? nextLocale}
      </button>
    </div>
  );
};

export default Header;
