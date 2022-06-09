import {
  toCamelCase,
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
  clearQueryParams,
  getSelectedAccount,
  checkProductsInCatalog,
} from '../../scripts/scripts.js';

/**
 * The CategoryFilterController manages the state and behavior of the category filter.
 */
class CategoryFilterController {
  constructor(block, placeholders) {
    /**
     * Block HTMLElement
     * @type {HTMLElement}
     * @public
     */
    this.block = block;

    /**
     * Placeholders object
     * @type {Object}
     * @public
     */
    this.placeholders = placeholders;

    /**
     * The currently active filter
     * @type {Object}
     * @public
     */
    this.activeFilterConfig = {};

    // Check URL params for active filters
    this.applyURLParamFilters();
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
    clearQueryParams();
    this.block.dispatchEvent(new CustomEvent('filterUpdated', { detail: this.activeFilterConfig }));
  };

  applyURLParamFilters() {
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

  getFilterQueryParamsString() {
    return Object.keys(this.activeFilterConfig).map((key) => `${key}=${this.activeFilterConfig[key]}`).join('&');
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

    // filterConfig.fulltext = document.getElementById('fulltext').value;
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
  renderFacet(facet) {
    // const facet = filteredFacets[facetKey];
    //  const values = Object.keys(facet);
    const { label, attribute_code: attributeCode, options } = facet;
    return /* html */`
      <div class="products-facet">
        <h3>${label}</h3>
        ${options.map((option) =>/* html */`
            <input type="checkbox" value="${option.value}" id="products-filter-${option.value}" name="${attributeCode}">
            <label for="products-filter-${option.value}">${option.label} (${option.count})</label>`).join('')}
      </div>
    `;
  }

  /**
   * Render categories filter
   * @param {Object[]} collection
   */
  render() {
    // Render facets
    const facetsElement = this.block.querySelector('.products-facets');
    facetsElement.innerHTML = this.renderFacetsScafolding();

    // Render active facets
    const selectedFiltersContainer = this.block.querySelector('.products-filters-selected');
    Object.keys(this.activeFilterConfig).forEach((key) => {
      const value = this.activeFilterConfig[key];
      if (key !== 'fulltext' && key !== 'page') {
        const span = document.createElement('span');
        span.setAttribute('data-value', key);
        span.className = 'products-filters-tag';
        span.textContent = `${this.placeholders[toCamelCase(key)]}: ${value}`;
        span.addEventListener('click', this.onFacetDeSelected);
        selectedFiltersContainer.append(span);
      }
    });

    // Render filtered facets
    let facetsHTML = '';
    this.collectionFacets.forEach((facetKey) => {
      if (!['price', 'category_id'].includes(facetKey.attribute_code) && !this.activeFilterConfig[facetKey.attribute_code]) {
        facetsHTML += this.renderFacet(facetKey);
      }
    });

    const facetsList = this.block.querySelector('.products-filters-facetlist');

    // TODO: Should be sanitized...
    facetsList.innerHTML = facetsHTML;

    addEventListeners([...facetsList.querySelectorAll('input')], 'change', this.onFacetSelected.bind(this));
    facetsElement.querySelector('.products-filters-clear').addEventListener('click', this.onClearFacetSelection);
  }
}

/**
 * The CategoryPaginationController manages the state and behavior of the category filter.
 */
class CategoryPaginationController {
  constructor(block, placeholders) {
    /**
     * Block HTMLElement
     * @type {HTMLElement}
     * @public
     */
    this.block = block;

    /**
     * Placeholders object
     * @type {Object}
     * @public
     */
    this.placeholders = placeholders;
  }

  /**
   * Given page info, calculate pagination values
   * @param {number} totalCount
   * @param {Object} pageInfo
   * @returns
   */
  getPageValues(totalCount, pageInfo) {
    const { current_page: currentPage, page_size: pageSize, total_pages: totalPages } = pageInfo;
    const maxPagesDisplayed = 5;
    const maxPagesBeforeAfter = 3;

    let startPage;
    let endPage;
    if (totalPages <= maxPagesDisplayed) {
      startPage = 1;
      endPage = totalPages;
    } else if (currentPage <= maxPagesBeforeAfter) {
      startPage = 1;
      endPage = maxPagesDisplayed;
    } else if (currentPage + maxPagesBeforeAfter >= totalPages) {
      startPage = totalPages - maxPagesDisplayed + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - maxPagesBeforeAfter;
      endPage = currentPage + maxPagesBeforeAfter;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize - 1, totalCount - 1);

    const pages = Array.from(Array((endPage + 1) - startPage).keys()).map((i) => startPage + i);

    return {
      totalCount,
      currentPage,
      pageSize,
      totalPages,
      startPage,
      endPage,
      startIndex,
      endIndex,
      pages,
    };
  }

  /**
   * Callback for when a page number is selected from the pagination display
   * @param {MouseEvent} event
   */
  onPageSelected = (event) => {
    const selectedPage = event.target.getAttribute('data-page');
    addQueryParam('page', selectedPage);
    this.block.dispatchEvent(new CustomEvent('pageSelected', { detail: selectedPage }));
  };

  /**
   * Callback for when the left disclosure arrow is clicked
   * @param {MouseEvent} event
   */
  onPrevPage = (event) => {
    const prevPage = event.currentTarget.getAttribute('data-page');
    addQueryParam('page', prevPage);
    this.block.dispatchEvent(new CustomEvent('pageSelected', { detail: prevPage }));
  };

  /**
   * Callback for when the right disclosure arrow is clicked
   * @param {MouseEvent} event
   */
  onNextPage = (event) => {
    const nextPage = event.currentTarget.getAttribute('data-page');
    addQueryParam('page', nextPage);
    this.block.dispatchEvent(new CustomEvent('pageSelected', { detail: nextPage }));
  };

  /**
   * Render the pagination element
   * @param {number} totalCount
   * @param {Object} pageInfo
   */
  render(totalCount, pageInfo) {
    const pageValues = this.getPageValues(totalCount, pageInfo);
    const start = pageValues.currentPage === 1 ? 1 : pageValues.currentPage * pageValues.pageSize;
    const end = pageValues.currentPage === 1 ? pageValues.pageSize : start + pageValues.pageSize;
    const pagination = document.createElement('div');

    let paginationText = `${pageValues.totalCount} results`;
    if (pageValues.totalPages > 1) {
      paginationText = `${start}-${end} out of ${paginationText}`;
    }
    pagination.className = 'pagination-container';
    pagination.innerHTML = /* html */`
      <div class="pagination-text">${paginationText}</div>
      <div class="pagination">
        <div class="pagination-root">
          <a class="pagination-navbutton prev-page" aria-label="Show previous" data-page="${pageValues.currentPage - 1}">
              <span class="pagination-icon ${pageValues.currentPage === 1 ? 'disabled' : ''}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </span>
          </a>
          ${pageValues.pages.map((page) =>/* html */`
            <a class="pagination-tilebutton ${page === pageValues.currentPage ? 'active' : ''}">
                <div class="tilebutton-text" data-page="${page}">
                  ${page}
                </div>
            </a>
          `).join('')}
          <a class="pagination-navbutton next-page" aria-label="Show next" data-page="${pageValues.currentPage + 1}">
              <span class="pagination-icon ${pageValues.currentPage === pageValues.totalPages ? 'disabled' : ''}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
          </a>
        </div>
      </div>
    `;
    const resultsBlock = this.block.querySelector('.products-results');
    resultsBlock.append(pagination);

    // Listen for click events on page numbers
    addEventListeners([...this.block.querySelectorAll('.pagination-tilebutton')], 'click', this.onPageSelected);

    // If we are not on the first page, enable the left disclosure arrow
    if (pageValues.currentPage !== 1) {
      resultsBlock.querySelector('.prev-page').addEventListener('click', this.onPrevPage);
    }

    // If we are not on the last page, enable the right disclosure arrow
    if (pageValues.currentPage !== pageValues.totalPages) {
      resultsBlock.querySelector('.next-page').addEventListener('click', this.onNextPage);
    }
  }
}

/**
 * The CategoryResultsController loads and renders a categories product results
 */
class CategoryResultsController {
  constructor(block, placeholders) {
    /**
     * Block HTMLElement
     * @type {HTMLElement}
     * @public
     */
    this.block = block;

    /**
     * Placeholders object
     * @type {Object}
     * @public
     */
    this.placeholders = placeholders;

    /**
     * The CategoryFilterController is responsible for displaying the filter options
     * and notifying the CategoryResultsController when a filter is selected
     * @type {CategoryFilterController}
     * @public
     */
    this.categoryFilterController = new CategoryFilterController(block, placeholders);

    // Listen for filter changes
    this.block.addEventListener('filterUpdated', this.onFilterUpdated);

    /**
     * The CategoryPaginationController is responsible for rendering the pagination element
     * and notifying the CategoryResultsController when a page is selected
     * @type {CategoryPaginationController}
     * @public
     */
    this.categoryPaginationController = new CategoryPaginationController(
      this.block,
      this.placeholders,
    );

    // Listen for page changes
    this.block.addEventListener('pageSelected', this.onPageSelected);
    document.body.addEventListener('account-change', () => {
      window.location.reload();
    });

    // Listen for back/forward button clicks
    window.addEventListener('popstate', () => {
      this.categoryFilterController.applyURLParamFilters();
      this.fetchProducts();
    }, false);
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
    this.categoryPaginationController = new CategoryPaginationController(
      this.block,
      this.placeholders,
    );

    await this.fetchProducts();

    this.initializeSort();
  }

  async fetchProducts() {
    this.results = await lookupCategory(
      this.category,
      this.categoryFilterController.getFilterQueryParamsString(),
    );

    const {
      data: products,
      facets,
      totalCount,
      pageInfo,
    } = this.results;

    // Use the facets returned from API to render the filter options
    this.categoryFilterController.collectionFacets = facets;
    this.render(products, totalCount, pageInfo);
  }

  /**
   * Initialize sort dropdown
   */
  initializeSort() {
    const sortList = this.block.querySelector('.products-sortby ul');
    const selectSort = async (selected) => {
      [...sortList.children].forEach((li) => li.classList.remove('selected'));
      selected.classList.add('selected');
      const sortBy = document.getElementById('products-sortby');
      sortBy.textContent = selected.textContent;
      sortBy.dataset.sort = selected.dataset.sort;
      document.getElementById('products-sortby').textContent = selected.textContent;
      this.block.querySelector('.products-sortby ul').classList.remove('visible');
      await this.fetchProducts();
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
    const account = getSelectedAccount();
    let productInCatalog = true;
    if (account) {
      const matches = checkProductsInCatalog([product.sku], account, [product]);
      [productInCatalog] = matches;
    }

    const button = productInCatalog ? `<a class="button" href=${product.path}>${this.placeholders.addToCart}</a>` : `<a class="button disabled">${this.placeholders.notInCatalog}</a>`;
    const card = document.createElement('div');
    card.className = `${prefix}-card`;
    card.innerHTML = /* html */`
      <a><img src="${product.image}" alt="${product.name}" width="150" height="150"/></a>
      <div class="${prefix}-card-details">
        <h4><a href="${product.path}">${product.name}</a></h4>
        <p>${formatCurrency(product.final_price, this.placeholders.currency || 'USD')}</p>
        <p>${button}</p>
      </div>`;
    return (card);
  }

  onFilterUpdated = async (event) => {
    this.activeFilterConfig = event.detail;
    await this.fetchProducts();
  };

  onPageSelected = async () => {
    this.categoryFilterController.applyURLParamFilters();
    await this.fetchProducts();
  };

  onAccountChanged = () => {
    const filtered = this.filterCollection(this.results);
    this.render(filtered);
  };

  /**
   * Block render function
   * @param {Object[]} collection
   */
  render(collection, totalCount, pageInfo) {
    window.scrollTo({ top: 0 });

    // Update results cound
    document.querySelector('#products-results-count').textContent = totalCount;

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

    this.categoryFilterController.render();
    this.categoryPaginationController.render(totalCount, pageInfo);
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
