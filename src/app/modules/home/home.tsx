import React from 'react';
import { translate } from 'react-jhipster';

import { useAppSelector } from 'app/config/store';

export const Home = () => {
  // Subscribing to the locale makes the page re-render with the new translations when the language changes.
  useAppSelector(state => state.locale.currentLocale);

  return <h1>{translate('global.menu.home')}</h1>;
};

export default Home;
