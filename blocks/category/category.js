import {
  toCamelCase,
  getMetadata,
  buildBlock,
  loadBlock,
} from '../../scripts/helix-web-library.esm.js';

import {
  getPlaceholders,
  formatCurrency,
  getCategoriesKeyDictionary,
  getNumber,
  addEventListeners,
  lookupCategory,
  addQueryParam,
  removeQueryParam,
} from '../../scripts/scripts.js';

/**
 * The CategoryFilterController manages the state and behavior of the category filter.
 */
class CategoryFilterController {
  constructor(block, placeholders) {
    this.block = block;
    this.placeholders = placeholders;
    this.categoryFacets = this.getCategoryFacets();

    // Apply initial filter
    this.activeFilterConfig = {};
    const usp = new URLSearchParams(window.location.search);
    usp.forEach((value, key) => {
      if (key === 'query') {
        // fulltextElement.value = usp.get('query');
      }
      // TODO: Should be sanitized...
      this.activeFilterConfig[key] = value;
    });
  }

  /**
   * On Facet selected callback
   */
  onFacetSelected = () => {
    this.activeFilterConfig = this.getFilterConfig(this.block, this.activeFilterConfig);
    this.block.dispatchEvent(new CustomEvent('filterUpdated', { detail: this.activeFilterConfig }));
  };

  /**
   * On Facet deselected callback
   * @param {MouseEvent} event
   */
  onFacetDeSelected = (event) => {
    const value = event.currentTarget.getAttribute('data-value');
    delete this.activeFilterConfig[value];
    removeQueryParam(value);
    this.block.dispatchEvent(new CustomEvent('filterUpdated', { detail: this.activeFilterConfig }));
  };

  /**
   * On facet selection cleared
   * @param {MouseEvent} event
   */
  onClearFacetSelection = () => {
    this.activeFilterConfig = {};
    this.block.dispatchEvent(new CustomEvent('filterUpdated', { detail: this.activeFilterConfig }));
  };

  /**
   * Returns the facets for a category
   * @returns {Object} Category facet options
   */
  getCategoryFacets() {
    if (!this.categoryFacets) {
      const facets = getMetadata('facets');
      const facetsDictionary = {};
      if (facets) {
        facets.split(',').forEach((f) => {
          facetsDictionary[f] = {};
        });
      }
      return facetsDictionary;
    }
    return this.categoryFacets;
  }

  /**
   * Given a collection of products, returns facet options
   * @param {Object[]} collection
   * @param {Object} facets
   * @param {Object} filterConfig
   * @returns {Object} facet options for the collection
   */
  getCollectionFacets(collection) {
    const facetOptions = {};
    const facetKeys = Object.keys(this.categoryFacets);
    collection.forEach((row) => {
      facetKeys.forEach((facetKey) => {
        if (row[facetKey] && !this.activeFilterConfig[facetKey]) {
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
   * @returns {Object} A filter config
   */
  getFilterConfig() {
    const filterConfig = {};

    const selectedFilters = [...this.block.querySelectorAll('input[type="checkbox"]:checked')];
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
      ...this.activeFilterConfig,
    });
  }

  /**
   * Creates scafolding for the facets element
   * @returns {string}
   */
  renderFacetsScafolding() {
    return /* html */`
    <div>
      <div class="products-filters">
        <h2>${this.placeholders.filters}</h2>
        <div class="products-filters-selected"></div>
        <p><button class="products-filters-clear secondary">${this.placeholders.clearAll}</button></p>
        <div class="products-filters-facetlist"></div>
      </div>
      <div class="products-apply-filters">
        <button>See Results</button>
      </div>
    </div>`;
  }

  /**
   * Render a facet
   * @param {string} facetKey
   * @returns The facet HTML
   */
  renderFacet(facetKey, filteredFacets) {
    const facet = filteredFacets[facetKey];
    const values = Object.keys(facet);
    return /* html */`
      <div class="products-facet">
        <h3>${this.placeholders[toCamelCase(facetKey)]}</h3>
        ${values.map((value) =>/* html */`
            <input type="checkbox" value="${value}" id="products-filter-${value}" name="${facetKey}">
            <label for="products-filter-${value}">${value} (${facet[value]})</label>`).join('')}
      </div>
    `;
  }

  /**
   * Render categories filter
   * @param {Object[]} collection
   */
  render(collection) {
    // Update results cound
    this.block.querySelector('#products-results-count').textContent = collection.length;

    // Render facets
    const facetsElement = this.block.querySelector('.products-facets');
    facetsElement.innerHTML = this.renderFacetsScafolding();

    // Render active facets
    const selectedFiltersContainer = this.block.querySelector('.products-filters-selected');
    Object.keys(this.activeFilterConfig).forEach((key) => {
      const value = this.activeFilterConfig[key];
      if (key !== 'fulltext') {
        const span = document.createElement('span');
        span.setAttribute('data-value', key);
        span.className = 'products-filters-tag';
        span.textContent = `${this.placeholders[toCamelCase(key)]}: ${value}`;
        span.addEventListener('click', this.onFacetDeSelected);
        selectedFiltersContainer.append(span);
      }
    });

    // Render filtered facets
    const filteredFacets = this.getCollectionFacets(collection);
    const facetKeys = Object.keys(filteredFacets);
    let facetsHTML = '';
    facetKeys.forEach((facetKey) => {
      facetsHTML += this.renderFacet(facetKey, filteredFacets);
    });

    const facetsList = this.block.querySelector('.products-filters-facetlist');

    // TODO: Should be sanitized...
    facetsList.innerHTML = facetsHTML;

    addEventListeners([...facetsList.querySelectorAll('input')], 'change', this.onFacetSelected.bind(this));
    facetsElement.querySelector('.products-filters-clear').addEventListener('click', this.onClearFacetSelection);
  }
}

/**
 * The CategoryResultsController loads and renders a categories product results
 */
class CategoryResultsController {
  constructor(block, placeholders) {
    this.block = block;
    this.placeholders = placeholders;
    this.categoryFilterController = new CategoryFilterController(block, placeholders);
    this.block.addEventListener('filterUpdated', this.onFilterUpdated);
  }

  /**
   * Loads the category results
   */
  async load() {
    // Determine category to load based on last segment of url
    this.categoryId = window.location.pathname.split('/').pop();

    // Get the category dictionary for easy lookup
    this.categoriesDictionary = await getCategoriesKeyDictionary();

    // Get the category
    this.category = this.categoriesDictionary[this.categoryId];

    // Render the category page scafolding
    this.block.innerHTML = this.renderBlockScafolding();
    this.activeFilterConfig = this.categoryFilterController.activeFilterConfig;
    this.results = await lookupCategory(
      this.category,
      this.categoryFilterController.categoryFacets,
    );
    const filtered = this.filterCollection(this.results);
    this.render(filtered);
    this.initializeSort();
  }

  /**
   * Initialize sort dropdown
   */
  initializeSort() {
    const sortList = this.block.querySelector('.products-sortby ul');
    const selectSort = (selected) => {
      [...sortList.children].forEach((li) => li.classList.remove('selected'));
      selected.classList.add('selected');
      const sortBy = document.getElementById('products-sortby');
      sortBy.textContent = selected.textContent;
      sortBy.dataset.sort = selected.dataset.sort;
      document.getElementById('products-sortby').textContent = selected.textContent;
      this.block.querySelector('.products-sortby ul').classList.remove('visible');
      const filtered = this.filterCollection(this.results);
      this.render(filtered);
    };

    sortList.addEventListener('click', (event) => {
      selectSort(event.target);
    });

    addEventListeners([
      this.block.querySelector('.products-sort-button'),
      this.block.querySelector('.products-sortby p'),
    ], 'click', () => {
      this.block.querySelector('.products-sortby ul').classList.toggle('visible');
    });
  }

  /**
   * Filters a collection of results based on a filter config
   * @param {Object[]} results
   * @param {Object} filterConfig
   * @returns {Object[]} A filtered collection of results
   */
  filterCollection(collection) {
    const keys = Object.keys(this.activeFilterConfig);
    const tokens = {};

    keys.forEach((key) => {
      tokens[key] = this.activeFilterConfig[key].split(',').map((t) => t.trim());
    });
    const filteredCollection = collection.filter((row) => {
      const filterMatches = {};
      const matchedAll = keys.every((key) => {
        let matched = false;
        if (row[key]) {
          const rowValues = row[key].split(',').map((t) => t.trim());
          matched = tokens[key].some((t) => rowValues.includes(t));
        }
        if (key === 'fulltext') {
          const fulltext = row.name.toLowerCase();
          matched = fulltext.includes(this.activeFilterConfig.fulltext.toLowerCase());
        }
        filterMatches[key] = matched;
        return matched;
      });
      return (matchedAll);
    });

    return filteredCollection ?? collection;
  }

  /**
   * Creates the scafolding for the block
   * @param {Object} category
   * @param {Object} placeholders
   */
  renderBlockScafolding() {
    return /* html */`
    <div class="category-title">
      <h1>${this.category.name}</h1>
      <p class="products-results-count"><span id="products-results-count"></span> ${this.placeholders.results}</p>
    </div>
    <div class="products-controls">
      <input id="fulltext" placeholder="${this.placeholders.typeToSearch}" style="display:none">
      <button class="products-filter-button secondary">${this.placeholders.filter}</button>
      <button class="products-sort-button secondary">${this.placeholders.sort}</button>
    </div>
    <div class="products-facets">
    </div>
    <div class="products-sortby">
      <p>${this.placeholders.sortBy} <span data-sort="best" id="products-sortby">${this.placeholders.bestMatch}</span></p>
      <ul>
        <li data-sort="best">${this.placeholders.bestMatch}</li>
        <li data-sort="position">${this.placeholders.position}</li>
        <li data-sort="price-desc">${this.placeholders.priceHighToLow}</li>
        <li data-sort="price-asc">${this.placeholders.priceLowToHigh}</li>
        <li data-sort="name">${this.placeholders.productName}</li>
      </ul>
    </div>
    <div class="products-results"></div>`;
  }

  /**
   * Renders a product card
   * @param {Object} product
   * @param {string} prefix
   * @returns The product card element
   */
  renderProductCard(product, prefix) {
    const card = document.createElement('div');
    card.className = `${prefix}-card`;
    card.innerHTML = /* html */`
      <a><img src="${product.image}" alt="${product.name}" width="150" height="150"/></a>
      <div class="${prefix}-card-details">
        <h4><a href="${product.path}">${product.name}</a></h4>
        <p>${formatCurrency(product.final_price, this.placeholders.currency || 'USD')}</p>
        <p><a class="button" href=${product.path}>${this.placeholders.addToCart}</a></p>
      </div>`;
    return (card);
  }

  onFilterUpdated = (event) => {
    this.activeFilterConfig = event.detail;
    const filtered = this.filterCollection(this.results);
    this.render(filtered);
  };

  /**
   * Block render function
   * @param {Object[]} collection
   */
  render(collection) {
    // Update results cound
    this.block.querySelector('#products-results-count').textContent = collection.length;

    // Render facets
    const resultsElement = this.block.querySelector('.products-results');

    // Sort and render the results
    const sorts = {
      name: (a, b) => a.name.localeCompare(b.name),
      'price-asc': (a, b) => getNumber(a.final_price) - getNumber(b.final_price),
      'price-desc': (a, b) => getNumber(b.final_price) - getNumber(a.final_price),
    };
    const sortBy = document.getElementById('products-sortby') ? document.getElementById('products-sortby').dataset.sort : 'best';
    if (sortBy && sorts[sortBy]) collection.sort(sorts[sortBy]);

    // Clear the resultsElement and render the new results set
    resultsElement.innerHTML = '';
    collection.forEach((product) => {
      resultsElement.append(this.renderProductCard(product, 'products'));
    });

    this.categoryFilterController.render(collection);
  }
}

/**
 * Decorates a categories page
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const placeholders = await getPlaceholders('/ca/en');

  const categoryResultsView = new CategoryResultsController(block, placeholders);
  await categoryResultsView.load();

  const section = document.createElement('div');
  section.append(buildBlock('breadcrumbs', { elems: [] }));
  await loadBlock(section, false);
  block.prepend(section);
}
