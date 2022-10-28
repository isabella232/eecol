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

const UPSTREAM_DEV = 'http://localhost:3000';
const UPSTREAM_PROD = 'https://main--eecol--hlxsites.helix3.dev';
const dev = window.location.hostname.startsWith('localhost')
  || new URL(window.location.href).searchParams.get('dev') === 'true';
export const upstreamURL = dev ? UPSTREAM_DEV : UPSTREAM_PROD;

const loggedIn = !!sessionStorage.getItem('account') || document.cookie.indexOf('eecol.auth') > -1;
const loginRedirect = sessionStorage.getItem('loginRedirect') === 'true';
let quickLoadAuth = loggedIn || loginRedirect;

if (loginRedirect) {
  console.debug('login in progress...');
  sessionStorage.removeItem('loginRedirect');
}

/**
 * Application Store
 * @type {Store}
 */
export const store = new (class {
  constructor() {
    this._p = {};

    const pathParts = window.location.pathname.split('/').slice(1);
    const [r, l] = pathParts;
    this.region = r || 'ca';
    this.lang = l || 'en';
    this.hrefRoot = `/${this.region}/${this.lang}`;
    this.upstreamURL = upstreamURL;
    this.dev = dev;
    this.product = undefined;
    this.pageType = getMetadata('pagetype');

    this.autoLoad = [
      // module
      'Auth',
      // module -> [deps]
      ['Inventory', ['Auth']],
    ];
    this.autoLoad.forEach(this._proxy.bind(this));

    // manually proxy non-module but lazy blocks
    this._proxy('cart');
  }

  isLoginInProgress = () => loginRedirect;

  _proxy(mod) {
    let n = mod; // name
    if (Array.isArray(n)) {
      [n] = n;
    }
    this[n] = new Proxy({}, {
      get: (_, prop) => async (...args) => {
        await this.whenReady(n);
        if (typeof this[n][prop] === 'function') {
          return this[n][prop].call(this[n], ...args);
        }
        return this[n][prop];
      },
      set: (_, prop, val) => {
        (async () => {
          await this.whenReady(n);
          this[n][prop] = val;
        })();
        return true;
      },
    });
  }

  isReady(name) {
    const p = this._p[name];
    return this[name] && p && !p[0] && !p[2] && !(this[name] instanceof Proxy);
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
        ready();
      }
    }
  }

  initState(name) {
    let ready;
    const prom = new Promise((res) => {
      ready = () => {
        console.debug(`[store] ${name} module ready`);
        this._p[name][0] = undefined; // remove resolver
        this._p[name][2] = false; // done loading
        res();
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
      console.debug(`[store] skip loading ${name}`);
      return undefined;
    }
    this.setLoading(name);

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
  if (window.categories) {
    await window.categories;
    return;
  }

  let done;
  window.categories = new Promise((res) => { done = res; });
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
  window.categories = categories;

  // Store categories in a dictionary
  window.categoriesKeyDictionary = categoriesKeyDictionary;
  window.categoriesIdDictionary = categoriesIdDictionary;
  window.categoriesNameDictionary = categoriesNameDictionary;
  done();
}

/**
 * Returns fetched categories
 * @returns {Promise<Record<string, string>>}
 */
export async function getCategories() {
  if (!window.categories) {
    await fetchCategories();
  }

  return window.categories;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Object}
 */
export async function getCategoriesNameDictionary() {
  if (!window.categoriesNameDictionary) {
    await fetchCategories();
  }

  return window.categoriesNameDictionary;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Promise<any>}
 */
export async function getCategoriesKeyDictionary() {
  if (!window.categoriesKeyDictionary) {
    await fetchCategories();
  }

  return window.categoriesKeyDictionary;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Promise<any>}
 */
export async function getCategoriesIdDictionary() {
  if (!window.categoriesIdDictionary) {
    await fetchCategories();
  }

  return window.categoriesIdDictionary;
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
    console.error('failed to lookup product: ', res);
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
    console.error(`failed to lookup catalog product (${res.status}): `, res);
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
  // TODO: Implement search
  if (!query) {
    return {};
  }
  const res = await fetch(
    `${upstreamURL}/api/catalog/search?q=${query}${page ? `&p=${page}` : ''}`,
  );
  if (!res.ok) {
    console.error(`failed to search (${res.status}): `, res);
    throw Error('failed to search');
  }

  return res.json();
}

export function getIcon(icons, alt) {
  // eslint-disable-next-line no-param-reassign
  icons = Array.isArray(icons) ? icons : [icons];
  const [defaultIcon, mobileIcon] = icons;
  let name = (mobileIcon && window.innerWidth < 600) ? mobileIcon : defaultIcon;
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
    console.error(`failed to get suggestions (${res.status}): `, res);
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
 * @param {*} amount
 * @param {*} currency
 * @returns
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
 * Helper function guarentees the return of a number primitive
 * @param {string|number} value
 * @returns
 */
export const getNumber = (value) => +value;

/**
 * Adds a query param to the window location
 * @param {string} key
 * @param {string} value
 */
export function addQueryParam(key, value) {
  const sp = new URLSearchParams(window.location.search);
  sp.set(key, value);
  const path = `${window.location.pathname}?${sp.toString()}`;
  window.history.pushState(null, '', path);
}

/**
 * Removes a query param from the window location
 * @param {string} key
 * @param {string} value
 */
export function removeQueryParam(key) {
  const sp = new URLSearchParams(window.location.search);
  sp.delete(key);
  const paramsString = sp.toString();
  const path = (paramsString !== '') ? `${window.location.pathname}?${paramsString}` : window.location.pathname;
  window.history.pushState(null, '', path);
}

/**
 * Clears all query params from the window location
 * @param {string} key
 * @param {string} value
 */
export function clearQueryParams() {
  window.history.pushState(null, '', window.location.pathname);
}

export const PageTypes = [
  'category',
  'product',
];

/**
 * check if products are available in catalog
 * @param {string[]} skus
 * @param {Object} account
 * @param {Object} hints
 */
export function checkProductsInCatalog(skus, account, hints) {
  const nameLookup = window.categoriesNameDictionary;
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
    console.warn('storeUserData() No account selected');
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
    console.warn('retrieveUserData() No account selected');
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
 * Initiates the login process
 */
export async function signIn() {
  quickLoadAuth = true;
  const ev = new Event('login');
  document.body.dispatchEvent(ev);
}

/**
 * Initiate logout
 */
export async function signOut() {
  quickLoadAuth = true;
  const ev = new Event('logout');
  document.body.dispatchEvent(ev);
}

export function isMobile() {
  return window.innerWidth < 900;
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
      console.error('Auto Blocking failed', error);
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
      // quick load, since no chance to impact PSI
      console.debug('quick load');
      delay = 0;
    }
    // eslint-disable-next-line import/no-cycle
    window.setTimeout(() => import('./delayed.js'), delay);
  })
  .decorate();
