import {
  toCamelCase,
  getMetadata,
} from 'https://cdn.skypack.dev/@dylandepass/helix-web-library@v1.6.1/dist/helix-web-library.esm.js';

import {
  getPlaceholders,
  formatCurrency,
  categoriesDictionary,
  getNumber,
  addEventListeners,
  lookupCategory,
  addQueryParam,
  removeQueryParam
} from '../../scripts/scripts.js';

/**
 * Decorates a categories page
 * @param {HTMLElement} block 
 */
export default async function decorate(block) {
  /**
   * Initialize sort dropdown
   */
  const initializeSort = () => {
    const sortList = block.querySelector('.products-sortby ul');
    const selectSort = (selected) => {
      [...sortList.children].forEach((li) => li.classList.remove('selected'));
      selected.classList.add('selected');
      const sortBy = document.getElementById('products-sortby');
      sortBy.textContent = selected.textContent;
      sortBy.dataset.sort = selected.dataset.sort;
      document.getElementById('products-sortby').textContent = selected.textContent;
      block.querySelector('.products-sortby ul').classList.remove('visible');
      const filtered = filterResults(results, activeFilterConfig);
      render(filtered);
    };

    sortList.addEventListener('click', (event) => {
      selectSort(event.target);
    });

    addEventListeners([
      block.querySelector('.products-sort-button'),
      block.querySelector('.products-sortby p'),
    ], 'click', () => {
      block.querySelector('.products-sortby ul').classList.toggle('visible');
    });
  };

  /**
   * On Facet selected callback
   */
  const onFacetSelected = () => {
    activeFilterConfig = getFilterConfig(block, activeFilterConfig);
    const filtered = filterResults(results, activeFilterConfig);
    render(filtered);
  };

  /**
   * On Facet deselected callback
   * @param {MouseEvent} event 
   */
  const onFacetDeSelected = (event) => {
    const value = event.currentTarget.getAttribute('data-value');
    delete activeFilterConfig[value];
    removeQueryParam(value);
    const filtered = filterResults(results, activeFilterConfig);
    render(filtered);
  };

  /**
   * On facet selection cleared
   * @param {MouseEvent} event 
   */
  const onClearFacetSelection = (event) => {
    activeFilterConfig = {};
    const filtered = filterResults(results, activeFilterConfig);
    render(filtered);
  };

  /**
   * Sorts a collection of results
   * @param {*} collection 
   */
  const sortCollection = (collection) => {
    const sorts = {
      name: (a, b) => a.name.localeCompare(b.name),
      'price-asc': (a, b) => getNumber(a.final_price) - getNumber(b.final_price),
      'price-desc': (a, b) => getNumber(b.final_price) - getNumber(a.final_price),
    };
    const sortBy = document.getElementById('products-sortby') ? document.getElementById('products-sortby').dataset.sort : 'best';
    if (sortBy && sorts[sortBy]) collection.sort(sorts[sortBy]);
  };

  /**
   * Block render function
   * @param {Object[]} collection 
   */
  const render = (collection) => {
    // Update results cound
    block.querySelector('#products-results-count').textContent = collection.length;

    // Render facets
    const filteredFacets = getCollectionFacets(collection, categoryFacets, activeFilterConfig);
    const facetsElement = block.querySelector('.products-facets');
    const resultsElement = block.querySelector('.products-results');
    facetsElement.innerHTML = renderFacetsScafolding(placeholders);
    renderActiveFacets(block, activeFilterConfig, placeholders, onFacetDeSelected, onClearFacetSelection);
    renderFilteredFacets(block, filteredFacets, placeholders, onFacetSelected);
    facetsElement.querySelector('.products-filters-clear').addEventListener('click', onClearFacetSelection);

    // Sort and render the results
    sortCollection(collection);

    // Clear the resultsElement and render the new results set
    resultsElement.innerHTML = '';
    collection.forEach((product) => {
      resultsElement.append(renderProductCard(product, 'products', placeholders));
    });
  }

  const placeholders = await getPlaceholders('/ca/en');
  const categoryId = window.location.pathname.split("/").pop();
  const category = categoriesDictionary[categoryId];
  const categoryFacets = getCategoryFacets();

  // Apply initial filter
  let activeFilterConfig = {};
  const usp = new URLSearchParams(window.location.search);
  for (const [key, value] of usp.entries()) {
    if (key === 'query') {
      fulltextElement.value = usp.get('query');
    }
    // TODO: Should be sanitized...
    activeFilterConfig[key] = value;
  }

  const results = await lookupCategory(category, categoryFacets);
  const filtered = filterResults(results, activeFilterConfig);
  block.innerHTML = renderBlockScafolding(category, placeholders);
  render(filtered);
  initializeSort();
}

/**
 * Returns the facets for a category
 * @returns {Object} Category facet options
 */
function getCategoryFacets() {
  const facets = getMetadata('facets');
  let results = {};
  if (facets) {
    facets.split(',').forEach((f) => {
      results[f] = {};
    });
  }
  return results;
}

/**
 * Given a collection of products, returns facet options
 * @param {Object[]} collection 
 * @param {Object} facets 
 * @param {Object} filterConfig 
 * @returns {Object} facet options for the collection
 */
function getCollectionFacets(collection, facets = {}, filterConfig = {}) {
  const facetOptions = {};
  const facetKeys = Object.keys(facets);
  collection.forEach((row) => {
    facetKeys.forEach((facetKey) => {
      if (row[facetKey] && !filterConfig[facetKey]) {
        const rowValues = row[facetKey].split(',').map((t) => t.trim());
        rowValues.forEach((val) => {
          if (!facetOptions[facetKey]) facetOptions[facetKey] = {};
          if (facetOptions[facetKey][val]) {
            facetOptions[facetKey][val] += 1;
          } else {
            facetOptions[facetKey][val] = 1;
          }
        });
      }
    });
  });

  return facetOptions;
}

/**
 * Constructs a filter config object
 * @param {HTMLElement} block 
 * @param {Object} activeFilterConfig 
 * @returns {Object} A filter config
 */
function getFilterConfig(block, activeFilterConfig) {
  const filterConfig = {};

  const selectedFilters = [...block.querySelectorAll('input[type="checkbox"]:checked')];
  selectedFilters.forEach((checked) => {
    const facetKey = checked.name;
    const facetValue = checked.value;
    addQueryParam(facetKey, facetValue);
    if (filterConfig[facetKey]) filterConfig[facetKey] += `, ${facetValue}`;
    else filterConfig[facetKey] = facetValue;
  });

  filterConfig.fulltext = document.getElementById('fulltext').value;
  return ({
    ...filterConfig,
    ...activeFilterConfig,
  });
};

/**
 * Filters a collection of results based on a filter config
 * @param {Object[]} results 
 * @param {Object} filterConfig 
 * @returns {Object[]} A filtered collection of results
 */
function filterResults(results, filterConfig) {
  const keys = Object.keys(filterConfig);
  const tokens = {};

  keys.forEach((key) => {
    tokens[key] = filterConfig[key].split(',').map((t) => t.trim());
  });
  const filteredResults = results.filter((row) => {
    const filterMatches = {};
    let matchedAll = keys.every((key) => {
      let matched = false;
      if (row[key]) {
        const rowValues = row[key].split(',').map((t) => t.trim());
        matched = tokens[key].some((t) => rowValues.includes(t));
      }
      if (key === 'fulltext') {
        const fulltext = row.name.toLowerCase();
        matched = fulltext.includes(filterConfig.fulltext.toLowerCase());
      }
      filterMatches[key] = matched;
      return matched;
    });
    return (matchedAll);
  });

  return filteredResults ?? results;
};

/**
 * Creates the scafolding for the block
 * @param {Object} category 
 * @param {Object} placeholders 
 */
function renderBlockScafolding(category, placeholders) {
  return /*html*/`
    <div class="category-title">
      <h1>${category.name}</h1>
      <p class="products-results-count"><span id="products-results-count"></span> ${placeholders.results}</p>
    </div>
    <div class="products-controls">
      <input id="fulltext" placeholder="${placeholders.typeToSearch}" style="display:none">
      <button class="products-filter-button secondary">${placeholders.filter}</button>
      <button class="products-sort-button secondary">${placeholders.sort}</button>
    </div>
    <div class="products-facets">
    </div>
    <div class="products-sortby">
      <p>${placeholders.sortBy} <span data-sort="best" id="products-sortby">${placeholders.bestMatch}</span></p>
      <ul>
        <li data-sort="best">${placeholders.bestMatch}</li>
        <li data-sort="position">${placeholders.position}</li>
        <li data-sort="price-desc">${placeholders.priceHighToLow}</li>
        <li data-sort="price-asc">${placeholders.priceLowToHigh}</li>
        <li data-sort="name">${placeholders.productName}</li>
      </ul>
    </div>
    <div class="products-results"></div>`;
};

/**
 * Creates scafolding the facets element
 * @param {Object} placeholders 
 * @returns {string}
 */
function renderFacetsScafolding(placeholders) {
  return /*html*/`
    <div>
      <div class="products-filters">
        <h2>${placeholders.filters}</h2>
        <div class="products-filters-selected"></div>
        <p><button class="products-filters-clear secondary">${placeholders.clearAll}</button></p>
        <div class="products-filters-facetlist"></div>
      </div>
      <div class="products-apply-filters">
        <button>See Results</button>
      </div>
    </div>`
};

/**
 * Renders a list of facet options
 * @param {HTMLElement} block 
 * @param {Object} facets 
 * @param {Object} placeholders 
 * @param {*} onFacetSelected 
 */
function renderFilteredFacets(block, facets, placeholders, onFacetSelected) {
  const facetKeys = Object.keys(facets);
  let facetsHTML = '';
  facetKeys.forEach((facetKey) => {
    facetsHTML += renderFacet(facetKey, facets, placeholders);
  });

  const facetsList = block.querySelector('.products-filters-facetlist');

  // TODO: Should be sanitized...
  facetsList.innerHTML = facetsHTML;

  addEventListeners([...facetsList.querySelectorAll('input')], 'change', onFacetSelected);
};

/**
 * Render all the actve facets in the facets container
 * @param {HTMLElement} block 
 * @param {Object} activeFilterConfig 
 * @param {Object} placeholders 
 * @param {*} onFacetDeSelected 
 */
function renderActiveFacets(block, activeFilterConfig, placeholders, onFacetDeSelected) {
  const selectedFiltersContainer = block.querySelector('.products-filters-selected');
  for (const [key, value] of Object.entries(activeFilterConfig)) {
    if (key === 'fulltext') {
      continue;
    };
    const span = document.createElement('span');
    span.setAttribute('data-value', key);
    span.className = 'products-filters-tag';
    span.textContent = `${placeholders[toCamelCase(key)]}: ${value}`;
    span.addEventListener('click', onFacetDeSelected);
    selectedFiltersContainer.append(span);
  };
}

/**
 * Render a facet
 * @param {string} facetKey 
 * @param {Object} categoryFacets 
 * @param {Object} placeholders 
 * @returns The facet HTML
 */
function renderFacet(facetKey, categoryFacets, placeholders) {
  const facet = categoryFacets[facetKey];
  const values = Object.keys(facet);
  return /*html*/`
      <div class="products-facet">
        <h3>${placeholders[toCamelCase(facetKey)]}</h3>
        ${values.map((value) => {
    return /*html*/`
            <input type="checkbox" value="${value}" id="products-filter-${value}" name="${facetKey}">
            <label for="products-filter-${value}">${value} (${facet[value]})</label>`
  }).join('')}
      </div>
    `;
};

/**
 * Renders a product card
 * @param {Object} product 
 * @param {string} prefix 
 * @param {Object} placeholders 
 * @returns The product card element
 */
export function renderProductCard(product, prefix, placeholders) {
  const card = document.createElement('div');
  card.className = `${prefix}-card`;
  card.innerHTML = /*html*/
    `<a><img src="${product.image}" alt="${product.name}" /></a>
     <div class="${prefix}-card-details">
      <h4>${product.name}</h4>
      <p>${formatCurrency(product.final_price, placeholders.currency || 'USD')}</p>
      <p>
        <a class="button" href=${product.path}>${placeholders.addToCart}</a>
      </p>
    </div>`;
  return (card);
}