/**
 * loads and decorates the footer
 * @param {Element} block The header block element
 */

export default async function decorate(block) {
  const accountNavPath = '/my-account/account-nav';
  const resp = await fetch(`${accountNavPath}.plain.html`);
  const html = await resp.text();
  const accountNav = document.createElement('div');
  accountNav.innerHTML = html;
  block.append(accountNav);
}
