/* eslint-disable import/no-cycle */
import {
  sampleRUM,
} from './helix-web-library.esm.js';

import { store } from './scripts.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

const log = logger('delayed');

(async () => {
  store.autoLoad.forEach((name) => {
    if (store.isLoading(name) || store.isReady(name)) {
      return;
    }
    log.debug(`auto loading ${name} module`);
    store.load(name);
  });
})();
