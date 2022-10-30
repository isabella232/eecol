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
  loader,
  once,
} from '../../scripts/scripts.js';

const MAX_SUGGESTIONS = 10;
const log = logger('header');

const w = window;
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

/**
 * @param {HTMLLinkElement} account
 * @param {Session} session
 */
async function updateAccountAction(account, session) {
  const ph = await phP;

  const [_icon, labelRoot, _portal] = account.children;
  const [authedLabel, label] = labelRoot.children;
  if (!session) {
    labelRoot.classList.remove('authed');
    authedLabel.classList.add('hidden');
    label.textContent = ph.login || 'Login';
    account.setAttribute('href', `${store.hrefRoot}/signin`);
    return;
  }

  account.removeAttribute('href');
  label.textContent = ph.account || 'Account';
  const [msg, name] = authedLabel.children;
  msg.textContent = `${ph.hello},`;
  name.textContent = session.customer.firstName;
  authedLabel.classList.remove('hidden');
  labelRoot.classList.add('authed');
}

/**
 * @param {HTMLLinkElement} cart
 * @param {Session} session
 */
function updateCartAction(cart, session) {
  const parent = cart.parentElement;
  if (!session) {
    parent.classList.add('hidden');
    return;
  }
  parent.classList.remove('hidden');
}

function updateActions() {
  const { session } = store.Auth;
  const wrapper = d.querySelector('.nav-toolbar-actions');
  const [account, cart] = [...wrapper.children];

  updateAccountAction(account.firstElementChild, session);
  updateCartAction(cart.firstElementChild, session);
}

/** update topbar elements that rely on a logged in user */
async function updateTopbar() {
  const ph = await phP;
  const { session } = store.Auth;

  const wrapper = d.querySelector('.topbar-cta').firstChild;
  const [msg, authLink] = [...wrapper.childNodes];

  if (session) {
    const { accountNumber, name } = session.company;
    msg.textContent = `${accountNumber} - ${name} | ${ph.currency}`;
    authLink.classList.add('hidden');
  } else {
    msg.textContent = `${ph.shopAt || 'Shop at'}`;
    authLink.classList.remove('hidden');
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
 * Lazy load a modal block after dependency or immediately on click
 * If an href is set on the parent action link, use it instead of the modal,
 * since that is the unauthenticated redirect.
 *
 * @param {HTMLDivElement} toolbar toolbar element
 * @param {string} name modal name, without the `-modal` suffix
 */
function lazyLoadModal(toolbar, name) {
  const portal = toolbar.querySelector(`.portal#${name}-modal`);
  const link = portal.closest('a.action');
  const block = portal.children[0];
  let ready = false;
  const load = async (clicked) => {
    if (ready) return;
    const { session } = store.Auth;
    if (link && link.href && typeof session !== 'object') {
      log.debug('redirect from action: ', name, link.href);
      const redirect = `${w.location.href}${w.location.search}`;
      w.location.href = `${link.href}#redirect=${encodeURIComponent(redirect)}`;
      // NOTE: this isn't necessary since there's a page load
      // but will be necessary if we change to SPA loading.
      once(portal, 'click', () => load(true));
      return;
    }

    log.debug('loading modal: ', name);
    ready = true;
    decorateBlock(block);
    const bp = loadBlock(block);
    if (clicked) {
      await Promise.all([store.load('Auth'), bp]);
      log.debug('loaded modal by click: ', name);
      store.emit(`${name}:modal:toggle`);
    }
  };
  once(portal, 'click', () => load(true));
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
      <a class="action" href="${store.hrefRoot}/signin">
        ${getIcon('account')}
        <label>
          <span class="authed-label hidden">
            <span class="msg">Hello,</span>
            <span class="name"></span>
          </span>
          <span class="label">Login</span>
        </label>
        <div class="portal" id="account-modal">
          <div class="account-modal"><!-- lazy --></div>
        </div>
      </a>
    </div>
    <div class="cart hidden">
      <a class="action">
        ${getIcon('cart')}
        <label>
          <span class="label">Cart <span class="qty">(0)</span></span>
        </label>
        <div class="portal" id="cart-modal">
          <div class="cart-modal"><!-- lazy --></div>
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

  // lazy load account & cart modals once on click, after Auth completes
  lazyLoadModal(toolbar, 'account', 'Auth');
  lazyLoadModal(toolbar, 'cart', 'Auth');

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
            <div class="nav-products-loading loader-wrapper">
              ${loader()}
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
      w.location.href = `${store.hrefRoot}/search?query=${e.target.value}`;
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

  once(productsBtn, 'mouseenter', async () => {
    log.debug('lazy load products');
    categs = await getCategories();
    categs = createCategory('', categs);
    updateProductsList();
  });
}

function update() {
  updateActions();
  updateTopbar();
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
    log.error('failed to load nav: ', resp);
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
    <a href=${store.hrefRoot}>
      <picture>
        ${getIcon('logo.png')}
      </picture>
    </a>
  </div>`;
  nav.prepend(logo);
  block.append(nav);

  setupProducts();

  store.on('auth:changed', update);
  store.whenReady('Auth', update);
  if (store.isReady('Auth')) {
    // if auth loaded first, initialize
    update();
  }

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
