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
  loadHeader,
  decorateBlock,
  loadBlock,
  makeLinksRelative,
} from './helix-web-library.esm.js';

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
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
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
    // If we are replacing the main content, we likely also want to add breadcrumbs
    section.prepend(buildBlock('breadcrumbs', { elems: [] }));
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
 * Fetches a hierarchy of categories from the server
 */
async function fetchCategories() {
  if (!window.categories) {
    const response = await fetch('https://main--eecol--hlxsites.hlx-orch.live/categories');
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
  }
}

/**
 * Returns fetched categories
 * @returns {Object}
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
 * @returns {Object}
 */
export async function getCategoriesKeyDictionary() {
  if (!window.categoriesKeyDictionary) {
    await fetchCategories();
  }

  return window.categoriesKeyDictionary;
}

/**
 * Returns a dictionary of fetched categories
 * @returns {Object}
 */
export async function getCategoriesIdDictionary() {
  if (!window.categoriesIdDictionary) {
    await fetchCategories();
  }

  return window.categoriesIdDictionary;
}

/**
 * Given a query string, return matching products
 * @param {string} query
 * @returns {Object}[]
 */
export async function searchProducts(query) {
  // TODO: Implement search
  return query;
}

/**
 * Returns an array of products for a category
 * @param {Object} category
 * @param {string} categoryFacets
 * @returns
 */
export async function lookupCategory(category, activeFilterUrlParams) {
  let products = [];
  const req = await fetch(`https://main--eecol--hlxsites.hlx-orch.live/productLookup?${category.uid ? `category=${category.uid}` : ''}${activeFilterUrlParams ? `&${activeFilterUrlParams}` : ''}`);
  if (req.status === 200) {
    products = await req.json();
  }
  return products;
}

/**
 * Returns an array of products for a category
 * @param {*} category
 * @param {*} categoryFacets
 * @returns
 */
export async function lookupProduct(sku) {
  let product = {};
  if (sku) {
    const req = await fetch(`https://main--eecol--hlxsites.hlx-orch.live/productLookup?sku=${sku}`);
    const json = await req.json();
    product = json.data;
  }
  return product;
}

/**
 * Return site placeholders
 * @returns {Object} Site placeholders
 */
export async function getPlaceholders() {
  if (!window.placeholders) {
    window.placeholders = await fetchPlaceholders('/ca/en');
  }
  return window.placeholders;
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
 */
export function addEventListeners(elements, event, callback) {
  elements.forEach((e) => {
    e.addEventListener(event, callback);
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

const PageTypes = [
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
 *
 * Start the Helix Decoration Flow
 *
 */
HelixApp.init({
  lcpBlocks: ['hero'],
  rumGeneration: ['project-1'],
  productionDomains: ['poc-staging.eecol.com'],
})
  .withLoadEager(async () => {
    await fetchCategories();
  })
  .withBuildAutoBlocks((main) => {
    try {
      const pageType = getMetadata('pagetype');
      if (PageTypes.includes(pageType)) {
        buildAutoBlock(main, pageType);
      } else {
        buildHeroBlock(main);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auto Blocking failed', error);
    }
  })
  .withLoadHeader(async (header) => {
    loadHeader(header);
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
    window.setTimeout(() => import('./delayed.js'), 100);
  })
  .decorate();
