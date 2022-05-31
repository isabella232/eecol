
import {
  fetchPlaceholders,
  toCamelCase,
  getMetadata,
} from 'https://cdn.skypack.dev/@dylandepass/helix-web-library@v1.6.1/dist/helix-web-library.esm.js';

import {
  lookupPages,
  formatCurrency,
  loadCategories,
  categoriesDictionary,
  categories
} from '../../scripts/scripts.js';


export function createProductCard(product, prefix, ph) {
  const card = document.createElement('div');
  card.className = `${prefix}-card`;
  card.innerHTML = /*html*/
    `<a><img src="${product.image}" alt="${product.name}" /></a>
     <div class="${prefix}-card-details">
      <h4>${product.name}</h4>
      <p>${formatCurrency(product.final_price, ph.currency || 'USD')}</p>
      <p>
        <a class="button" href=${product.path}>${ph.addToCart}</a>
      </p>
    </div>`;
  return (card);
}

export default async function decorate(block) {
  const ph = await fetchPlaceholders('/ca/en');
  await loadCategories();
  const addEventListeners = (elements, event, callback) => {
    elements.forEach((e) => {
      e.addEventListener(event, callback);
    });
  };

  const config = {
    category: window.location.pathname.split("/").pop(),
    facets: getMetadata('facets')
  }

  block.innerHTML = `<div class="products-controls"><input id="fulltext" placeholder="${ph.typeToSearch}">
      <p class="products-results-count"><span id="products-results-count"></span> ${ph.results}</p>
      <button class="products-filter-button secondary">${ph.filter}</button>
      <button class="products-sort-button secondary">${ph.sort}</button>
    </div>
    <div class="products-facets">
    </div>
    <div class="products-sortby">
      <p>${ph.sortBy} <span data-sort="best" id="products-sortby">${ph.bestMatch}</span></p>
      <ul>
        <li data-sort="best">${ph.bestMatch}</li>
        <li data-sort="position">${ph.position}</li>
        <li data-sort="price-desc">${ph.priceHighToLow}</li>
        <li data-sort="price-asc">${ph.priceLowToHigh}</li>
        <li data-sort="name">${ph.productName}</li>
      </ul>
    </div>
  </div>
  <div class="products-results">
  </div>`;

  const resultsElement = block.querySelector('.products-results');
  const facetsElement = block.querySelector('.products-facets');
  block.querySelector('.products-filter-button').addEventListener('click', () => {
    block.querySelector('.products-facets').classList.toggle('visible');
  });

  addEventListeners([
    block.querySelector('.products-sort-button'),
    block.querySelector('.products-sortby p'),
  ], 'click', () => {
    block.querySelector('.products-sortby ul').classList.toggle('visible');
  });

  const sortList = block.querySelector('.products-sortby ul');
  const selectSort = (selected) => {
    [...sortList.children].forEach((li) => li.classList.remove('selected'));
    selected.classList.add('selected');
    const sortBy = document.getElementById('products-sortby');
    sortBy.textContent = selected.textContent;
    sortBy.dataset.sort = selected.dataset.sort;
    document.getElementById('products-sortby').textContent = selected.textContent;
    block.querySelector('.products-sortby ul').classList.remove('visible');
    // eslint-disable-next-line no-use-before-define
    runSearch(createFilterConfig());
  };

  sortList.addEventListener('click', (event) => {
    selectSort(event.target);
  });

  const highlightResults = (res) => {
    const fulltext = document.getElementById('fulltext').value;
    if (fulltext) {
      res.querySelectorAll('h4').forEach((title) => {
        const content = title.textContent;
        const offset = content.toLowerCase().indexOf(fulltext.toLowerCase());
        if (offset >= 0) {
          title.innerHTML = `${content.substr(0, offset)}<span class="highlight">${content.substr(offset, fulltext.length)}</span>${content.substr(offset + fulltext.length)}`;
        }
      });
    }
  };

  const displayResults = async (results) => {
    resultsElement.innerHTML = '';
    results.forEach((product) => {
      resultsElement.append(createProductCard(product, 'products', ph));
    });
    highlightResults(resultsElement);
  };

  const getSelectedFilters = () => [...block.querySelectorAll('input[type="checkbox"]:checked')];

  const createFilterConfig = () => {
    const filterConfig = { ...config };
    delete filterConfig.facets;
    getSelectedFilters().forEach((checked) => {
      const facetKey = checked.name;
      const facetValue = checked.value;
      if (filterConfig[facetKey]) filterConfig[facetKey] += `, ${facetValue}`;
      else filterConfig[facetKey] = facetValue;
    });
    filterConfig.fulltext = document.getElementById('fulltext').value;
    return (filterConfig);
  };

  // const renderFacet = (facet, values) => {
  //   const facetValues = Object.keys(facets[facetKey]);
  //   return /*html*/`
  //     <div class="products-facet">
  //       <h3>Manufacturer</h3>
  //       ${values.map((value) => {
  //     return /*html*/`
  //           <input type="checkbox" value="E-17" id=`products-filter-${value}` name="bulb_shape">
  //           <label for="products-filter-E-17">E-17 (1)</label>
  //         `
  //   })
  //     }
  //     </div>
  //   `;
  // };

  const displayFacets = (facets, filters) => {
    const selected = getSelectedFilters().map((check) => check.value);
    const facetKeys = Object.keys(facets);
    facetsElement.innerHTML = /*html*/`
      <div>
        <div class="products-filters">
          <h2>${ph.filters}</h2>
          <div class="products-filters-selected"></div>
          <p><button class="products-filters-clear secondary">${ph.clearAll}</button></p>
          <div class="products-filters-facetlist"></div>
        </div>
        <div class="products-apply-filters">
          <button>See Results</button>
        </div>
      </div>`;

    addEventListeners([
      facetsElement.querySelector('.products-apply-filters button'),
      facetsElement.querySelector(':scope > div'),
      facetsElement,
    ], 'click', (event) => {
      if (event.currentTarget === event.target) block.querySelector('.products-facets').classList.remove('visible');
    });

    const selectedFilters = block.querySelector('.products-filters-selected');
    selected.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'products-filters-tag';
      span.textContent = tag;
      span.addEventListener('click', () => {
        document.getElementById(`products-filter-${tag}`).checked = false;
        const filterConfig = createFilterConfig();
        // eslint-disable-next-line no-use-before-define
        runSearch(filterConfig);
      });
      selectedFilters.append(span);
    });

    facetsElement.querySelector('.products-filters-clear').addEventListener('click', () => {
      selected.forEach((tag) => {
        document.getElementById(`products-filter-${tag}`).checked = false;
      });
      const filterConfig = createFilterConfig();
      // eslint-disable-next-line no-use-before-define
      runSearch(filterConfig);
    });

    /* list facets */
    const facetsList = block.querySelector('.products-filters-facetlist');
    facetKeys.forEach((facetKey) => {
      const filter = filters[facetKey];
      const filterValues = filter ? filter.split(',').map((t) => t.trim()) : [];
      const div = document.createElement('div');
      div.className = 'products-facet';
      const h3 = document.createElement('h3');
      h3.innerHTML = ph[toCamelCase(facetKey)];
      div.append(h3);
      const facetValues = Object.keys(facets[facetKey]);
      facetValues.forEach((facetValue) => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = facetValue;
        input.checked = filterValues.includes(facetValue);
        input.id = `products-filter-${facetValue}`;
        input.name = facetKey;
        const label = document.createElement('label');
        label.setAttribute('for', input.id);
        label.textContent = `${facetValue} (${facets[facetKey][facetValue]})`;
        div.append(input, label);
        input.addEventListener('change', () => {
          const filterConfig = createFilterConfig();
          // eslint-disable-next-line no-use-before-define
          runSearch(filterConfig);
        });
      });
      facetsList.append(div);
    });
  };

  const getPrice = (string) => +string;

  const runSearch = async (filterConfig = config) => {
    const facets = {};
    config.facets.split(',').forEach((f) => {
      facets[f] = {};
    });
    // const sorts = {
    //   name: (a, b) => a.title.localeCompare(b.title),
    //   'price-asc': (a, b) => getPrice(a.price) - getPrice(b.price),
    //   'price-desc': (a, b) => getPrice(b.price) - getPrice(a.price),
    // };

    const results = await lookupCategory(filterConfig.category, facets);

    // const sortBy = document.getElementById('products-sortby') ? document.getElementById('products-sortby').dataset.sort : 'best';
    // if (sortBy && sorts[sortBy]) results.sort(sorts[sortBy]);

    block.querySelector('#products-results-count').textContent = results.length;
    displayResults(results, null);
    displayFacets(facets, filterConfig);
  };

  const fulltextElement = block.querySelector('#fulltext');
  fulltextElement.addEventListener('input', () => {
    runSearch(createFilterConfig());
  });

  if (!Object.keys(config).includes('fulltext')) {
    fulltextElement.style.display = 'none';
  }

  const usp = new URLSearchParams(window.location.search);
  if (usp.has('query')) {
    fulltextElement.value = usp.get('query');
  }
  runSearch(createFilterConfig(config));
}

async function lookupCategory(categoryId, facets) {
  const category = categoriesDictionary[categoryId];
  if (category) {
    const req = await fetch(`https://wesco.experience-adobe.com/productLookup?category=${category.uid}&facets=${Object.keys(facets).join(',')}`);
    const json = await req.json();
    const products = json.data;

    const results = products.filter((row) => {
      populateFacetOptions(row, facets);
      return row;
    });
    return results;
  }
}

function populateFacetOptions(row, facets) {
  const facetKeys = Object.keys(facets);
  facetKeys.forEach((facetKey) => {
    if (row[facetKey]) {
      const rowValues = row[facetKey].split(',').map((t) => t.trim());
      rowValues.forEach((val) => {
        if (facets[facetKey][val]) {
          facets[facetKey][val] += 1;
        } else {
          facets[facetKey][val] = 1;
        }
      });
    }
  });
}