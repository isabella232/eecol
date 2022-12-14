/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {
  HelixApp,
  buildBlock,
  getMetadata,
  fetchPlaceholders,
  decorateBlock,
  loadBlock,
  makeLinksRelative,
  createOptimizedPicture,
  decorateSections,
} from './helix-web-library.esm.js';

export const SESSION_KEY = 'wesco.session';

const w = window;
const { location } = w;

/** @type {LoggerFactory} */
w.logger = (() => {
  const dc = ['#0066CC', '#0066FF', '#0099CC', '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF', '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC'];
  let i = 0; // default color index
  const s = (pc) => {
    let c = pc;
    if (!c) c = dc[i]; i += 1; if (i === dc.length) i = 0;
    else if (c.startsWith('color:')) return c;
    return `color:${c}`;
  };
  return (name, color, colors = { debug: 'green', warn: 'yellow', error: 'red' }, tty = console) => {
    const names = Array.isArray(name) ? name : [name];
    const nc = s(color);
    const log = Object.fromEntries(Object.entries(tty).map(([lvl, fn]) => {
      const mc = colors[lvl] ? s(colors[lvl]) : 'color:#fff';
      return [lvl, (...ms) => {
        const [msgs, objs] = [[], []];
        ms.forEach((m) => (typeof m === 'object' ? objs.push(m) : msgs.push(m)));
        return fn(`%c ${names.map((n) => `[${n}]`).join(' ')} %c [${lvl.toUpperCase()}] ${msgs.join(' ')}`, nc, mc, ...objs);
      }];
    }));
    // sub-logger
    log.logger = (...a) => logger([...names, a[0]], a[1] || nc, a[2] || colors, a[3] || tty);
    return log;
  };
})();

const log = logger('scripts.js');
const UPSTREAM_DEV = 'http://localhost:3000';
const UPSTREAM_PROD = 'https://main--eecol--hlxsites.helix3.dev';
const dev = location.hostname.startsWith('localhost')
  || new URL(location.href).searchParams.get('dev') === 'true';
export const upstreamURL = dev ? UPSTREAM_DEV : UPSTREAM_PROD;
export const PageTypes = [
  'category',
  'product',
];

// already logged in or logging in
const ql = [
  !!sessionStorage.getItem(SESSION_KEY),
  location.pathname.endsWith('/signin') && location.hash,
];
const quickLoadAuth = ql[0] || ql[1];

/**
 * Application Store
 * @type {Store}
 */
export const store = new (
  class {
    constructor() {
      this._p = {};
      this._h = {};
      this._log = log.logger('store');

      const pathParts = location.pathname.split('/').slice(1);
      const [r, l] = pathParts;
      this.region = r || 'ca';
      this.lang = l || 'en';
      this.hrefRoot = `/${this.region}/${this.lang}`;
      this.upstreamURL = upstreamURL;
      this.dev = dev;
      this.product = undefined;
      this.pageType = getMetadata('pagetype');
      [this.hadSess] = ql;

      this.graph = {
        Auth: [],
        Inventory: ['Auth'],
        Cart: ['Auth', 'Inventory'],
      };
      this.autoLoad = [
        'Auth',
      ];

      Object.keys(this.graph).forEach(this._proxy.bind(this));
    }

    _proxy(mod) {
      let n = mod; // name
      if (Array.isArray(n)) {
        [n] = n;
      }
      this[n] = new Proxy({}, {
        get: (_, prop) => async (...args) => {
          if (!this.isLoading(n)) this.load(n);
          await this.whenReady(n);
          if (typeof this[n][prop] === 'function') {
            return this[n][prop].call(this[n], ...args);
          }
          return this[n][prop];
        },
        set: (_, prop, val) => {
          if (!this.isLoading(n)) this.load(n);
          (async () => {
            await this.whenReady(n);
            this[n][prop] = val;
          })();
          return true;
        },
      });
    }

    emit(ev, data) {
      (async () => {
        const [scope] = ev.split(':');
        const dest = Object.keys(this.graph).find((k) => k.toLowerCase() === scope);
        if (dest && !this.isReady(dest)) {
          this._log.debug(`waiting for scope '${scope}' (${dest}) before emitting '${ev}'`);
          await this.load(dest);
          this._log.debug(`scope '${scope}' ready`);
        }
        const hs = this._h[ev] || [];
        await Promise.all(hs.map((h) => h && h.call(null, data)));
      })().catch((e) => this._log.error('failed to emit event: ', e));
    }

    on(ev, h) {
      if (!this._h[ev]) {
        this._h[ev] = [];
      }
      const len = this._h[ev].push(h);
      return () => {
        delete this._h[len - 1];
      };
    }

    isReady(name) {
      const p = this._p[name];
      return (this[name] && p && !p[0] && !p[2]
        && (!this[name].prototype || !(this[name] instanceof Proxy)));
    }

    isLoading(name) {
      const p = this._p[name];
      return this[name] && p && p[0] && p[2];
    }

    moduleReady(name) {
      if (!this._p[name]) {
        this._p[name] = [undefined, Promise.resolve(), false];
      } else {
        const [ready] = this._p[name];
        if (ready) {
          ready(this[name]);
        }
      }
    }

    initState(name) {
      let ready;
      const prom = new Promise((res) => {
        ready = (mod) => {
          this._log.debug(`${name} module ready`);
          this._p[name][0] = undefined; // remove resolver
          this._p[name][2] = false; // done loading
          res(mod);
        };
      });
      this._p[name] = [ready, prom, false];
    }

    setLoading(name) {
      if (!this._p[name]) {
        this.initState(name);
      }
      this._p[name][2] = true;
    }

    whenReady(name) {
      if (!this._p[name]) {
        this.initState(name);
      }
      return this._p[name][1];
    }

    registerModule(name, module) {
      this[name] = module;
      this.moduleReady(name);
    }

    async load(name) {
      if (this.isReady(name) || this.isLoading(name)) {
        return this._p[name][1];
      }
      this._log.debug(`start loading ${name}`);
      this.setLoading(name);

      // load deps
      const deps = this.graph[name];
      if (deps && deps.length) {
        this._log.debug(`'${name}' waiting for deps: `, deps);
        await Promise.all((deps).map(this.load.bind(this)));
        this._log.debug(`'${name}' deps ready, load now`);
      }

      // load module
      const ready = this.whenReady(name);
      const pkg = await import(`./modules/${name}.js`);

      if (!pkg.default) {
        throw Error(`Invalid module: ${name}`);
      }
      const module = await pkg.default(this);
      this.registerModule(name, module);
      return ready;
    }
  })();
w.store = store; // for debugging

/** Simple deep duplicate object */
export function dupe(o) {
  if (!o || typeof o !== 'object') {
    return o;
  }
  return JSON.parse(JSON.stringify(o));
}

export function signinHref() {
  const redirect = `${w.location.pathname}${w.location.search}`;
  return `${store.hrefRoot}/signin#redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Make element from string
 * @param {string} content
 */
export function el(content) {
  const tmp = document.createElement('div');
  tmp.innerHTML = content;
  return tmp.firstElementChild;
}

/**
 * HTML string template tag
 * @param {string[]} strs
 * @param  {...(string|Element)[]} params
 */
export function htmlstr(strs, ...params) {
  let res = '';
  strs.forEach((s, i) => {
    const p = params[i];
    res += s;
    if (!p) return;
    if (p instanceof HTMLElement) {
      res += p.outerHTML;
    } else {
      res += p;
    }
  });
  return res;
}

export function html(strs, ...params) {
  return el(htmlstr(strs, ...params));
}

export function isMobile() {
  return window.innerWidth < 900;
}

export const loader = () => html`
  <div class="loader">
    <div class="loader-progress"></div>
  </div>`;

/**
 * Builds the hero autoblock
 * @param {HTMLElement} main
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');

  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
    const elems = [];
    const currentSection = h1.closest('main > div');
    if (!currentSection.previousElementSibling && currentSection.children.length < 5) {
      [...currentSection.children].forEach((child) => { elems.push(child); });
    } else {
      elems.push(picture);
      elems.push(h1);
    }

    section.append(buildBlock('hero', { elems }));
    main.prepend(section);
  } else if (!h1 && picture && picture.parentElement.tagName === 'MAIN') {
    main.prepend(html`
    <div>
      ${buildBlock('hero', { elems: [html`<p>${picture}</p>`] })}
    </div>`);
    picture.remove();
  }
}

/**
 * Builds an autoblock, the contents of which will be put into main
 * @param {HTMLElement} main
 */
function buildAutoBlock(main, blockName, replace = true, prepend = false) {
  const section = document.createElement('div');
  section.append(buildBlock(blockName, { elems: [] }));
  if (replace) {
    main.innerHTML = '';
  }
  return prepend ? main.prepend(section) : main.append(section);
}

/**
 * Recursively build a dictionary of categories
 * @param {Object} category
 * @param {Object} categoriesKeyDictionary
 * @param {Object} categoriesIdDictionary
 * @param {Object} categoriesNameDictionary
 */
function buildCategoryDictionary(
  category,
  categoriesKeyDictionary,
  categoriesIdDictionary,
  categoriesNameDictionary,
) {
  const clone = { ...category };
  delete clone.children;
  categoriesKeyDictionary[category.url_key] = clone;
  categoriesIdDictionary[category.uid] = clone;
  categoriesNameDictionary[category.name] = clone;
  if (category.children) {
    category.children.forEach((child) => buildCategoryDictionary(
      child,
      categoriesKeyDictionary,
      categoriesIdDictionary,
      categoriesNameDictionary,
    ));
  }
}

/**
 * Captilies the first letter of every word in a string
 * @param {string} string
 * @returns {string} A string with the first letter of every word capitalized
 */
export function titleCase(string) {
  return string
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Fetches a hierarchy of categories from the server
 */
async function fetchCategories() {
  if (w.categories) {
    await w.categories;
    return;
  }

  let done;
  w.categories = new Promise((res) => { done = res; });
  const response = await fetch(`${upstreamURL}/api/categories`);
  const json = await response.json();
  const categories = json.data.categories?.items[0].children;
  const categoriesKeyDictionary = {};
  const categoriesIdDictionary = {};
  const categoriesNameDictionary = {};
  categories.forEach((child) => buildCategoryDictionary(
    child,
    categoriesKeyDictionary,
    categoriesIdDictionary,
    categoriesNameDictionary,
  ));

  // Store categories in a hierarchy
  w.categories = categories;

  // Store categories in a dictionary
  w.categoriesKeyDictionary = categoriesKeyDictionary;
  w.categoriesIdDictionary = categoriesIdDictionary;
  w.categoriesNameDictionary = categoriesNameDictionary;
  done();
}

/**
 * Returns fetched categories
 * @returns {Promise<Record<string, string>>}
 */
export async function getCategories() {
  if (!w.categories) {
    await fetchCategories();
  }

  return w.categories;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Object}
 */
export async function getCategoriesNameDictionary() {
  if (!w.categoriesNameDictionary) {
    await fetchCategories();
  }

  return w.categoriesNameDictionary;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Promise<any>}
 */
export async function getCategoriesKeyDictionary() {
  if (!w.categoriesKeyDictionary) {
    await fetchCategories();
  }

  return w.categoriesKeyDictionary;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Promise<any>}
 */
export async function getCategoriesIdDictionary() {
  if (!w.categoriesIdDictionary) {
    await fetchCategories();
  }

  return w.categoriesIdDictionary;
}

function replaceProductImages(data) {
  return data.map((product) => {
    if (typeof product.image === 'string') {
      const url = new URL(product.image);
      product.image = `${upstreamURL}${url.pathname}?format=webply&quality=medium&width=750`;
    }
    return product;
  });
}

/**
 * Returns an array of products for a category
 * @param {Object} category
 * @param {Promise<string>} categoryFacets
 * @returns
 */
export async function lookupCategory(category, activeFilterUrlParams) {
  let products = [];
  const res = await fetch(`${upstreamURL}/api/products?${category.uid ? `category=${category.uid}` : ''}${activeFilterUrlParams ? `&${activeFilterUrlParams}` : ''}`);
  if (!res.ok) {
    return products;
  }
  products = await res.json();
  products.data = replaceProductImages(products.data);
  return products;
}

/**
 * @param {ProductView[]} views
 * @returns {ProductBase[]}
 */
function transformProductViews(views) {
  return views.map((v) => {
    /** @type {ProductBase} */
    const product = v;
    if (v.images && v.images.length) {
      // eslint-disable-next-line prefer-destructuring
      product.image = v.images[0];
    }

    return product;
  });
}

/**
 * Returns an array of products for a category
 * @param {string} sku The product sku
 * @returns {Promise<ProductData[]>}
 */
export async function lookupProduct(sku) {
  let product = {};
  if (!sku) {
    return product;
  }
  const res = await fetch(`${upstreamURL}/api/products/${sku}`);
  if (!res.ok) {
    log.error('failed to lookup product: ', res);
    throw Error('failed to lookup product');
  }

  const data = await res.json();
  [product] = replaceProductImages(data.data);

  return product;
}

/**
 * Returns an array of products for a category
 * @param {string} sku The product sku
 * @returns {Promise<ProductBase[]>}
 */
export async function lookupCatalogProduct(sku) {
  if (!sku) {
    return {};
  }
  const res = await fetch(`${upstreamURL}/api/catalog/products/${sku}`);
  if (!res.ok) {
    log.error(`failed to lookup catalog product (${res.status}): `, res);
    throw Error('failed to lookup catalog product');
  }

  const data = await res.json();
  return replaceProductImages(transformProductViews(data.data.products))[0];
}

/**
 * Given a query string, return matching products
 * @param {string} query
 * @param {number} page
 * @returns {Promise<SearchResult>}
 */
export async function searchProducts(query, page) {
  if (!query) {
    return {};
  }
  const res = await fetch(
    `${upstreamURL}/api/catalog/search?q=${query}${page ? `&p=${page}` : ''}`,
  );
  if (!res.ok) {
    log.error(`failed to search (${res.status}): `, res);
    throw Error('failed to search');
  }

  return res.json();
}

export function getIcon(icons, alt) {
  // eslint-disable-next-line no-param-reassign
  icons = Array.isArray(icons) ? icons : [icons];
  const [defaultIcon, mobileIcon] = icons;
  let name = (mobileIcon && w.innerWidth < 600) ? mobileIcon : defaultIcon;
  let icon = `${name}.svg`;
  if (name.endsWith('.png')) {
    icon = name;
    name = name.slice(0, -4);
  }
  return (`<img class="icon icon-${name}${alt ? ` icon-${alt}` : ''}" src="/icons/${icon}" alt="${alt || name}">`);
}

/**
 *
 * @param {string} query
 * @returns {Promise<SearchSuggestionResult>}
 */
export async function searchSuggestions(query) {
  if (!query) {
    return {};
  }
  const res = await fetch(`${upstreamURL}/api/catalog/search?q=${query}&s=1`);
  if (!res.ok) {
    log.error(`failed to get suggestions (${res.status}): `, res);
    throw Error('failed to get suggestions');
  }

  return res.json();
}

/**
 * Return site placeholders
 * @returns {Promise<Record<string, string>>} Site placeholders
 */
export async function getPlaceholders() {
  return fetchPlaceholders(store.hrefRoot);
}

/**
 * Formats a price given a currency
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  return (formatter.format(amount));
}

/**
 * Helper function to add a callback to multiple HTMLElements
 * @param {HTMLElement|HTMLElement[]} els - elements
 * @param {string|string[]} evs - events
 * @param {(e: Event)=>any} cb - handler
 */
export function addEventListeners(els, evs, cb) {
  // eslint-disable-next-line no-param-reassign
  els = Array.isArray(els) ? els : [els];
  // eslint-disable-next-line no-param-reassign
  evs = Array.isArray(evs) ? evs : [evs];

  els.forEach((elem) => {
    evs.forEach((ev) => {
      elem.addEventListener(ev, cb);
    });
  });
}

/**
 * Listen to an event one time
 * @param {HTMLElement} elem
 * @param {string} ev
 * @param {() => any} cb
 * @returns {()=>void} manual remover function
 */
export function once(elem, ev, cb) {
  let remove;
  const wrap = (...args) => {
    remove();
    cb.call(null, ...args);
  };
  elem.addEventListener(ev, wrap);
  remove = () => elem.removeEventListener(ev, wrap);
  return remove;
}

/**
 * Adds a query param to the window location
 * @param {string} key
 * @param {string} value
 */
export function addQueryParam(key, value) {
  const sp = new URLSearchParams(w.location.search);
  sp.set(key, value);
  const path = `${w.location.pathname}?${sp.toString()}`;
  w.history.pushState(null, '', path);
}

/**
 * Removes a query param from the window location
 * @param {string} key
 * @param {string} value
 */
export function removeQueryParam(key) {
  const sp = new URLSearchParams(w.location.search);
  sp.delete(key);
  const paramsString = sp.toString();
  const path = (paramsString !== '') ? `${w.location.pathname}?${paramsString}` : w.location.pathname;
  w.history.pushState(null, '', path);
}

/**
 * Clears all query params from the window location
 * @param {string} key
 * @param {string} value
 */
export function clearQueryParams() {
  w.history.pushState(null, '', w.location.pathname);
}

/**
 * check if products are available in catalog
 * @param {string[]} skus
 * @param {Object} account
 * @param {Object} hints
 */
export function checkProductsInCatalog(skus, account, hints) {
  const nameLookup = w.categoriesNameDictionary;
  if (account && account.config) {
    const allowedCategs = account.config.Categories.map((categ) => (nameLookup[categ] ? nameLookup[categ].uid : ''));

    return skus.map((sku, i) => {
      const hint = hints[i];
      return allowedCategs.some((categ) => hint.categories.includes(categ));
    });
  }
  return skus.map(() => true);
}

/**
 * check if categories are available in catalog
 * @param {string[]} categories
 * @param {Object} account
 * @returns {boolean[]} catergoy is in catalog
 */
export function checkCategoriesInCatalog(categories, account) {
  const allowedCategs = account.config.Categories;
  return categories.map((cat) => allowedCategs.includes(cat));
}

/**
 * Sets the currently set accountId in localstorage
 * @param {string} accountId
 */
export function setSelectedAccount(accountId) {
  localStorage.setItem('selectedAccount', accountId);
  const accountChange = new Event('account-change');
  document.body.dispatchEvent(accountChange);
}

/**
 * gets the currently set account via localstorage
 * @return {Object} selected account
 */
export function getSelectedAccount() {
  const account = sessionStorage.getItem('account') ? JSON.parse(sessionStorage.getItem('account')) : '';
  if (account && account.name) {
    const { accounts } = account;
    const selectedAccount = localStorage.getItem('selectedAccount');
    if (account.accountsById && !account.accountsById[selectedAccount]) {
      setSelectedAccount(accounts[0].accountId, accounts[0]);
      return (accounts[0]);
    }
    return account.accountsById[selectedAccount];
  }
  return undefined;
}

/**
 * Set key/value, scoped to selected account
 * @param {string} key
 * @param {Object|string|number|boolean} val
 */
export function storeUserData(key, val) {
  const id = localStorage.getItem('selectedAccount');
  if (!id) {
    log.warn('storeUserData() No account selected');
    return;
  }

  const scopedKey = `account/${id}/${key}`;
  localStorage.setItem(scopedKey, typeof val === 'object' ? JSON.stringify(val) : val);
}

/**
 * Get value for key, scoped to selected account
 * @param {string} key
 */
export function retrieveUserData(key) {
  const id = localStorage.getItem('selectedAccount');
  if (!id) {
    log.warn('retrieveUserData() No account selected');
    return null;
  }

  const scopedKey = `account/${id}/${key}`;
  const data = localStorage.getItem(scopedKey);
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

/**
 * Fetch the logged in user
 * @returns {import('./auth.js').Authentication}
 */
export function getUserAccount() {
  return sessionStorage.getItem('account') ? JSON.parse(sessionStorage.getItem('account')) : undefined;
}

/**
 *
 * Start the Helix Decoration Flow
 *
 */
HelixApp.init({
  lcpBlocks: ['hero', 'product'],
  rumGeneration: ['project-1'],
  productionDomains: ['poc-staging.eecol.com'],
  lazyStyles: true,
  eagerHeader: true,
  favicon: '/styles/favicon.ico',
})
  .withLoadEager(async () => {
    if (quickLoadAuth) {
      log.debug(`quick load due to${ql[0] ? ' existing session' : ''}${ql[0] && ql[1] ? ' &' : ''}${ql[1] ? ' auth redirect' : ''}`);
      await store.load('Auth');
    }
  })
  .withBuildAutoBlocks((main) => {
    try {
      if (PageTypes.includes(store.pageType)) {
        buildAutoBlock(main, store.pageType);
        document.body.classList.add('commerce-page');
      } else {
        buildHeroBlock(main);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      log.error('Auto Blocking failed', error);
    }
  })
  .withDecorateSections((main) => {
    decorateSections(main);
    const sections = [...main.querySelectorAll('.section')];
    sections.forEach((section) => {
      const bg = section.dataset.background;
      if (bg) {
        const picture = createOptimizedPicture(bg);
        picture.classList.add('section-background');
        section.prepend(picture);
      }
    });
  })
  .withLoadLazy(async () => {
    const header = document.querySelector('header');
    const template = getMetadata('template');
    if (template === 'account') {
      const main = document.querySelector('main');
      const accountNav = buildBlock('account-nav', '');
      header.append(accountNav);
      decorateBlock(accountNav);
      await loadBlock(accountNav);
      main.parentElement.insertBefore(accountNav, main);
      makeLinksRelative(accountNav);
    }
  })
  .withLoadDelayed(() => {
    let delay = 4000;
    if (quickLoadAuth) {
      delay = 0;
      // autoload all
      store.autoLoad = Object.keys(store.graph);
    }
    // eslint-disable-next-line import/no-cycle
    setTimeout(() => import('./delayed.js'), delay);
  })
  .decorate();
