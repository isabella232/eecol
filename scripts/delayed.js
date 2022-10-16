/* eslint-disable import/no-cycle */
import {
  sampleRUM,
} from './helix-web-library.esm.js';

import { store } from './scripts.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

(async () => {
  store.autoLoad.forEach(async (toLoad) => {
    let name = toLoad;
    let deps = [];
    if (Array.isArray(toLoad)) {
      ([name, deps] = toLoad);
    }

    if (deps.length) {
      console.debug(`[delayed] auto load waiting for ${deps}`);
    }
    await Promise.all(deps.map((dep) => store.whenReady(dep)));
    console.debug(`[delayed] auto loaded ${name} module`);

    store.load(name);
  });
})();
