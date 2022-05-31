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

import { HelixApp, decorateSections, buildBlock, getMetadata } from 'https://cdn.skypack.dev/@dylandepass/helix-web-library@v1.6.1/dist/helix-web-library.esm.js';

export let categoriesDictionary = {};
export let categories = [];

HelixApp.init({
  lcpBlocks: ['hero'],
  rumGeneration: ['project-1'],
  productionDomains: ['poc-staging.eecol.com']
})
  .withBuildAutoBlocks((main) => {
    try {
      const pageType = getMetadata('pagetype');
      if (pageType === 'category') {
        buildCategoryBlock(main);
      } else {
        console.log('builder hero');
        buildHeroBlock(main);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auto Blocking failed', error);
    }
  })
  .decorate();

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

function buildProductBlock(main) {
  const picture = main.querySelector('picture');
  const h1 = main.querySelector('h1');

  if (picture && h1) {
    const section = document.createElement('div');
    section.append(buildBlock('product', { elems: [h1, picture] }));
    main.prepend(section);
  }
}

function buildCategoryBlock(main) {
  const section = document.createElement('div');
  section.append(buildBlock('products', { elems: [] }));
  main.prepend(section);
}

function buildCategoryDictionary(category, categoriesDictionary) {
  categoriesDictionary[category.url_key] = { ...category };
  delete categoriesDictionary[category.url_key].children;
  if (category.children) {
    category.children.forEach(child => buildCategoryDictionary(child, categoriesDictionary));
  }
}

export async function loadCategories() {
  if (categories.length === 0) {
    const response = await fetch('https://wesco.experience-adobe.com/categories');
    const json = await response.json();
    categories = json.categories.items[0].children;
    categories.forEach(child => buildCategoryDictionary(child, categoriesDictionary));
    buildCategoryDictionary(categories, categoriesDictionary);
    categoriesDictionary = categoriesDictionary;
  }
}

export async function lookupPages(config, facets = {}) {
  /* load index */
  if (!window.categories) {
    window.categories = await fetchCategories();
  }
  if (!window.pageIndex) {
    const resp = await fetch('/query-index.json');
    const json = await resp.json();
    const lookup = {};
    json.data.forEach((row) => {
      lookup[row.path] = row;
    });
    window.pageIndex = { data: json.data, lookup };
  }

  /* simple array lookup */
  if (Array.isArray(config)) {
    const pathnames = config;
    return (pathnames.map((path) => window.pageIndex.lookup[path]).filter((e) => e));
  }

  /* setup config */
  const keys = Object.keys(config);
  const tokens = {};
  keys.forEach((key) => {
    tokens[key] = config[key].split(',').map((t) => t.trim());
  });

  let products = [];
  if (config.category) {
    const category = window.categoriesDictionary[config.category];
    if (category) {
      const req = await fetch(`https://wesco.experience-adobe.com/productLookup?category=${category.uid}`);
      const json = await req.json();
      products = json.data;
    }
  }

  /* filter */
  const results = products.filter((row) => {
    // const filterMatches = {};
    // let matchedAll = keys.every((key) => {
    //   let matched = false;
    //   if (row[key]) {
    //     const rowValues = row[key].split(',').map((t) => t.trim());
    //     matched = tokens[key].some((t) => rowValues.includes(t));
    //   }
    //   if (key === 'fulltext') {
    //     const fulltext = row.title.toLowerCase();
    //     matched = fulltext.includes(config.fulltext.toLowerCase());
    //   }
    //   filterMatches[key] = matched;
    //   return matched;
    // });

    // const isProduct = () => !!row.price;

    // if (!isProduct()) matchedAll = false;

    /* facets */
    /** facet keys = ['manufacturer'] */
    // populateFacetOptions(row, facets);
  });
  return products;
}

export function formatCurrency(amount, currency) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });
  return (formatter.format(amount));
}
