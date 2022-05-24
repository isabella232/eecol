import {
  readBlockConfig,
  decorateIcons,
  makeLinksRelative,
  fetchPlaceholders,
  lookupPages,
  loadBlock,
  decorateBlock,
} from '../../scripts/scripts.js';

import { signIn, signOut, getCurrentAccount } from '../../scripts/auth.js';

/**
 * collapses all open nav sections
 * @param {Element} sections The container element
 */

function collapseAllNavSections(sections) {
  sections.querySelectorAll('.nav-sections > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', 'false');
  });
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  block.textContent = '';

  const ph = await fetchPlaceholders('/ca/en');

  // fetch nav content
  const navPath = cfg.nav || '/nav';
  const resp = await fetch(`${navPath}.plain.html`);
  if (resp.ok) {
    const html = await resp.text();

    // decorate nav DOM
    const nav = document.createElement('nav');
    nav.innerHTML = html;
    decorateIcons(nav);
    makeLinksRelative(nav);

    const classes = ['topbar', 'brand', 'sections', 'search', 'tools'];
    classes.forEach((e, j) => {
      const section = nav.children[j];
      if (section) section.classList.add(`nav-${e}`);
    });

    // ----< tripod's auth poc >-------------------
    // hack: get sign-in button
    const authNavi = nav.children[0].children[1];
    while (authNavi.firstChild) {
      authNavi.firstChild.remove();
    }
    const account = await getCurrentAccount();
    if (account) {
      authNavi.appendChild(document.createTextNode('Welcome '));
      const btnProfile = document.createElement('a');
      authNavi.appendChild(btnProfile);
      btnProfile.innerText = account.name;
      btnProfile.href = '/profile.html';
      authNavi.appendChild(document.createTextNode(' | '));

      const btnSignOut = document.createElement('a');
      authNavi.appendChild(btnSignOut);
      btnSignOut.innerText = 'Sign out';
      btnSignOut.style.cursor = 'pointer';
      btnSignOut.onclick = signOut;
    } else {
      const btnSignIn = document.createElement('a');
      authNavi.appendChild(btnSignIn);
      btnSignIn.innerText = 'Sign in';
      btnSignIn.onclick = signIn;
      btnSignIn.style.cursor = 'pointer';
      authNavi.appendChild(document.createTextNode(' or '));
      const btnRegister = document.createElement('a');
      authNavi.appendChild(btnRegister);
      btnRegister.href = '/content/eecol/ca/en/register';
      btnRegister.innerText = 'Register';
      authNavi.appendChild(document.createTextNode(' CAD'));
    }
    // ----< eof tripod's auth poc >-------------------

    const navSections = [...nav.children][2];
    if (navSections) {
      navSections.querySelectorAll(':scope > ul > li').forEach((navSection) => {
        if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
        navSection.addEventListener('click', () => {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          collapseAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        });
      });
    }

    nav.querySelectorAll('.nav-tools .icon').forEach((icon) => {
      icon.closest('p').classList.add(`nav-tools-${icon.className.split('icon-')[1]}`);
    });

    const search = nav.querySelector('.nav-search');
    const suggestions = document.createElement('div');
    suggestions.className = 'nav-search-suggestions';
    search.prepend(suggestions);
    const input = document.createElement('input');
    input.id = 'nav-search-input';
    input.setAttribute('list', 'nav-search-suggestion');
    input.setAttribute('placeholder', ph.searchPlaceholder);
    search.prepend(input);

    const MAX_SUGGESTIONS = 10;

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
      return results.map((e) => ({ title: e.textContent, href: e.href }));
    };

    const fillSuggestions = async () => {
      suggestions.textContent = '';
      const query = input.value;
      const results = filterNav(query);
      if (results.length < MAX_SUGGESTIONS) {
        const products = await lookupPages({ fulltext: query });
        while (results.length < MAX_SUGGESTIONS && products.length) {
          const res = products.shift();
          results.push({ title: res.title, href: res.path });
        }
      }
      results.forEach((r) => {
        const option = document.createElement('div');
        option.innerHTML = `<a href="${r.href}">${addHighlight(r.title, query)}</a>`;
        suggestions.append(option);
      });
    };

    fillSuggestions();
    input.addEventListener('input', fillSuggestions);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        window.location.href = `/ca/en/search?query=${input.value}`;
      }
    });
    input.addEventListener('focus', () => {
      setTimeout(() => suggestions.classList.add('visible'), 300);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => suggestions.classList.remove('visible'), 300);
    });

    // hamburger for mobile
    const hamburger = document.createElement('div');
    hamburger.classList.add('nav-hamburger');
    hamburger.innerHTML = '<div class="nav-hamburger-icon"></div>';
    hamburger.addEventListener('click', () => {
      const expanded = nav.getAttribute('aria-expanded') === 'true';
      document.body.style.overflowY = expanded ? '' : 'hidden';
      nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });
    nav.prepend(hamburger);
    nav.setAttribute('aria-expanded', 'false');
    decorateIcons(nav);
    block.append(nav);

    /* init cart */
    const cartIcon = block.querySelector('.icon-cart');
    const cart = document.createElement('div');
    cartIcon.parentElement.append(cart);
    cart.append(cartIcon);
    cart.classList.add('cart');
    decorateBlock(cart);
    loadBlock(cart);
  }
}
