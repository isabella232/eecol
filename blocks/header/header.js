import {
  readBlockConfig,
  makeLinksRelative,
  loadBlock,
  decorateBlock,
  getMetadata,
  buildBlock,
} from '../../scripts/helix-web-library.esm.js';
import {
  getCategories,
  getSelectedAccount,
  checkCategoriesInCatalog,
  addEventListeners,
  PageTypes,
  getPlaceholders,
  searchSuggestions,
  getIcon,
  html,
  store,
} from '../../scripts/scripts.js';

const MAX_SUGGESTIONS = 10;

const d = document;
let categs; // categories
let phP; // placeholders promise
let nav; // nav root element

function debounce(cb, time = 600) {
  let timer;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    timer = setTimeout(() => cb(...args), time);
  };
}

async function updateTopBar() {
  const account = sessionStorage.getItem('account') ? JSON.parse(sessionStorage.getItem('account')) : '';

  const wrapper = d.querySelector('.topbar-cta').firstChild;
  const [msg, authLink] = [...wrapper.childNodes];
  const def = msg.firstChild;

  if (account && account.name) {
    // set welcome message
    console.debug('[header] set account: ', account);
    msg.innerText = 'welcome';
    authLink.style.display = 'none';
  } else {
    console.debug('[header] unset account');
    msg.innerText = def;
    phP.then((ph) => {
      msg.innerText = `${ph.shopAt || def}`;
    });
    authLink.style.display = 'inline-block';
  }
}

/**
 * collapses all open nav sections
 * @param {Element} sections The container element
 */

function collapseAllNavSections(sections) {
  sections.querySelectorAll('.nav-sections > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', 'false');
  });
}

function createCategory(title, children) {
  const ul = d.createElement('ul');

  const firstChild = children[0];
  if (firstChild) {
    ul.classList.add(`level-${firstChild.level}`);
  }
  ul.classList.add('nav-group');

  if (title) {
    const li = d.createElement('li');
    li.classList.add('nav-group-title');
    li.innerText = title;
    ul.appendChild(li);
  }

  children.forEach((child) => {
    if (child.url_path) {
      const li = d.createElement('li');
      li.innerHTML = `<a href="${store.hrefRoot}/products/category/${child.url_path.split('.')[0]}">${child.name}</a>${child.level === 2 ? '<span><img class="disclosure-arrow" src="/icons/disclosure-white.svg"></span>' : ''}`;
      if (child.children) {
        li.append(createCategory(child.level !== 3 ? child.name : '', child.children));
      }
      ul.append(li);
    }
  });
  return (ul);
}

/**
 * @param {HTMLDivElement} content
 */
function createTopBar(content) {
  const items = ['tagline', 'cta'];

  // TODO: handle languages, switcher
  const wrapper = html`
<div class="nav-topbar-wrapper">
  <div class="nav-topbar">
    <div class="language-switcher">
      <span>English</span>
      ${getIcon('canada-flag', 'flag')}
      ${getIcon('caret')}
    </div>
    ${[...content.children].map((c, i) => `<div class="topbar-${items[i]}">${c.outerHTML}</div>`).join('\n')}
  </div>
</div>`;

  return wrapper;
}

function createToolbar() {
  const toolbar = html`
<div class="nav-toolbar">
  <div class="nav-toolbar-actions">
    <div class="account">
      <a class="action">
        ${getIcon('account')}
        <span class="label">Login</span>
      </a>
    </div>
    <div class="cart" data-block-name="cart" data-block-status="loaded">
      <a class="action">
        ${getIcon('cart')}
        <span class="label cart-display">Cart</span>
        <div class="portal" id="cart">
          <div class="cart"><!-- lazy --></div>
        </div>
      </a>
    </div>
    <div class="hamburger">
      <a class="action">
        ${getIcon('hamburger')}
        <span class="label">Menu</span>
      </a>
    </div>
  </div>
</div>`;

  // add hamburger click
  const hamburger = toolbar.querySelector('div.hamburger');
  hamburger.addEventListener('click', () => {
    const expanded = nav.getAttribute('aria-expanded') === 'true';
    nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  });

  // load cart once on click
  const cartPortal = toolbar.querySelector('.portal#cart');
  let cartBlock = cartPortal.children[0];
  cartPortal.addEventListener('click', () => {
    if (!cartBlock) return;
    decorateBlock(cartBlock);
    loadBlock(cartBlock);
    cartBlock = undefined;
    store.cart.toggleModal();
  });

  return toolbar;
}

/**
 * @param {HTMLDivElement} content
 */
function createNavSections(content) {
  const first = content.firstElementChild.firstElementChild;
  first.remove(); // div > ul > li (products)

  const sections = html`
  <div class="nav-sections">
    <ul class="level-1">
      <li class="nav-drop" aria-expanded="false">
        ${getIcon('hamburger')}
        <u>Products</u>
        <ul id="nav-products-root" class="level-2 nav-group">
          <li>
            <div class="nav-products-loading">
              <span class="dot-flashing"></span>
            </div>
          </li>
        </ul>
      </li>
      ${content.firstElementChild.innerHTML}
    </ul>
  </div>`;

  const expand = (e) => {
    const section = e.target.closest('li');
    const expanded = section.getAttribute('aria-expanded') === 'true';
    collapseAllNavSections(sections);
    section.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  };

  sections.querySelectorAll(':scope > ul > li').forEach((section) => {
    const subsection = section.querySelector('ul');
    if (!subsection) {
      return;
    }
    section.classList.add('nav-drop');
    subsection.classList.add('nav-group', 'level-2');
    section.addEventListener('click', expand);
  });

  return sections;
}

function createSearch() {
  const search = html`
<div class="nav-search">
  <div class="nav-search-suggestions"></div>
  <input id="nav-search-input" list="nav-search-suggestion" placeholder="Search by keyword, item or part number">
  <p>
    <a href="/search">
      ${getIcon('search')}
    </a>
  </p>
</div>`;

  const input = search.querySelector('input');
  const suggestions = search.querySelector('.nav-search-suggestions');

  phP.then((ph) => { input.setAttribute('placeholder', ph.searchPlaceholder); });

  const addHighlight = (text, highlight) => {
    if (highlight) {
      const offset = text.toLowerCase().indexOf(highlight.toLowerCase());
      if (offset >= 0) {
        return `${text.substr(0, offset)}<span class="highlight">${text.substr(offset, highlight.length)}</span>${text.substr(offset + highlight.length)}`;
      }
    }
    return text;
  };

  const filterNav = (query) => {
    const q = query.toLowerCase();
    const results = [...nav.querySelectorAll('a')].filter((e) => e.textContent.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
    return results.map((e) => ({ title: e.textContent, href: e.href, hidden: !!e.closest('.hidden') }));
  };

  const fillSuggestions = async () => {
    const query = input.value;
    suggestions.textContent = '';

    if (query.length < 3) {
      suggestions.classList.remove('visible');
      return;
    }

    // TODO: insert loading indicator in suggestionsContainer

    const results = filterNav(query);
    if (results.length < MAX_SUGGESTIONS) {
      const products = await searchSuggestions(query);
      while (results.length < MAX_SUGGESTIONS && products.items.length) {
        const { productView: item } = products.items.shift();
        results.push({ title: item.name, href: `${store.hrefRoot}/products/${item.sku.toLowerCase()}` });
      }
    }

    // TODO: remove loading indicator in suggestionsContainer

    suggestions.classList[results.length > 0 ? 'add' : 'remove']('visible');

    results.forEach((r) => {
      const option = d.createElement('div');
      option.innerHTML = `<a href="${r.href}">${addHighlight(r.title, query)}</a>`;
      suggestions.append(option);
    });
  };

  addEventListeners(input, 'input', debounce((e) => {
    fillSuggestions(e.target);
  }));

  addEventListeners(input, 'blur', () => {
    setTimeout(() => suggestions.classList.remove('visible'), 100);
  });

  addEventListeners(input, 'keypress', (e) => {
    if (e.key === 'Enter') {
      window.location.href = `${store.hrefRoot}/search?query=${e.target.value}`;
    }
  });

  return search;
}

const filterCategoriesByAccount = () => {
  /* adjust navigation based on account information */
  const account = getSelectedAccount();
  if (account && categs) {
    const topLevel = [...categs.querySelectorAll(':scope > li > a')];
    const show = checkCategoriesInCatalog(topLevel.map((a) => a.textContent), account);
    topLevel.forEach((a, i) => { a.closest('li').className = show[i] ? '' : 'hidden'; });
  }
};

function updateProductsList() {
  filterCategoriesByAccount();

  const root = nav.querySelector('#nav-products-root');
  if (!root || !categs) return;

  // TODO: fix filtering when account is switched,
  // currently categs global is detached because innerHTML is inserted here
  root.innerHTML = categs.innerHTML;
}

async function setupProducts() {
  const productsBtn = nav.querySelector('#nav-products-root').parentElement;

  const loadProducts = async () => {
    console.debug('[header] lazy load products list');
    productsBtn.removeEventListener('mouseenter', loadProducts);

    categs = await getCategories();
    categs = createCategory('', categs);
    updateProductsList();
  };
  addEventListeners(productsBtn, 'mouseenter', loadProducts);
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  phP = getPlaceholders();

  // fetch nav content
  const navPath = cfg.nav || '/nav';
  const resp = await fetch(`${navPath}.plain.html`);
  if (!resp.ok) {
    console.error('Failed to load nav: ', resp);
    return;
  }
  const content = await resp.text();

  // decorate nav DOM
  nav = html`<nav aria-expanded="false">${content}</nav>`;
  makeLinksRelative(nav);

  const topbar = nav.children[0];
  topbar.replaceWith(createTopBar(topbar));

  const toolbar = nav.children[1];
  toolbar.replaceWith(createToolbar());

  const navSections = nav.children[2];
  navSections.replaceWith(createNavSections(navSections));

  const search = nav.children[3];
  search.replaceWith(createSearch(search));

  const logo = html`
  <div class="nav-logo">
    <picture>
      ${getIcon('logo.png')}
    </picture>
  </div>`;
  nav.prepend(logo);

  logo.addEventListener('click', () => {
    window.location = `${store.hrefRoot}`;
  });

  block.append(nav);

  d.body.addEventListener('account-change', debounce(async () => {
    /* account switch */
    updateProductsList();
  }, 1));

  d.body.addEventListener('login-update', () => {
    /* logged-in state changed, reflect in top bar */
    updateTopBar();
  });

  updateTopBar();

  setupProducts();

  const pageType = getMetadata('pagetype');
  if (PageTypes.includes(pageType)) {
    const section = d.createElement('div');
    const breadcrumbs = buildBlock('breadcrumbs', '');
    section.append(breadcrumbs);
    nav.append(section);
    decorateBlock(breadcrumbs);
    loadBlock(breadcrumbs, false);
  }
}
