import entitiesReducers from 'app/entities/reducers';
import loadingBar from 'app/shared/reducers/loading-bar';

import locale from './locale';

/* jhipster-needle-add-reducer-import - JHipster will add reducer here */

const rootReducer = {
  locale,
  loadingBar,
  /* jhipster-needle-add-reducer-combine - JHipster will add reducer here */
  ...entitiesReducers,
};

export default rootReducer;
