import { getSelectedAccount } from "../../scripts/scripts.js";

const ACCOUNT_CHANGE_EVT = 'account-change';

/**
 * @param {HTMLElement} block
 */
function updateAccount(block) {
  const account = getSelectedAccount();
  const existing = block.querySelector(':scope > .nav-group.account');

  if(!account) {
    if(existing) {
      block.removeChild(existing);
    }
    return;
  }

  const group = document.createElement('div');
  group.classList.add('nav-group', 'account')
  group.innerHTML = `
  <div class="account-wrapper">
    <p>My Account</p>
    <a href="./">${account.accountId} - ${account.accountName}</a>
  </div>
  `;
  
  if(existing) {
    block.replaceChild(group, existing);
  } else {
    block.prepend(group);
  }
}


/**
 * loads and decorates the account side nav bar
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const accountNavPath = '/my-account/account-nav';
  const resp = await fetch(`${accountNavPath}.plain.html`);
  const html = await resp.text();
  block.innerHTML = html;

  block.querySelectorAll('div').forEach((navGroup) => {
    navGroup.classList.add('nav-group');
  });

  updateAccount(block);
  document.body.addEventListener(ACCOUNT_CHANGE_EVT, updateAccount.bind(this, block));
}
