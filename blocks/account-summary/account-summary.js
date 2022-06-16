import { getSelectedAccount } from "../../scripts/scripts.js";

const ACCOUNT_CHANGE_EVT = 'account-change';

/**
 * @typedef {Object} Account
 * @property {string} accountId
 * @property {string} accountName
 */

/**
 * @typedef {Object} SummarySection
 * @property {string} name - section name
 * @property {string|undefined} action - html string for link on header
 */

/**
 * Contact info summary
 * 
 * @param {Account} account
 * @return {string} content
 */
function createContactInfo(account) {
  return `
  <div>
  contact info section...
  </div>`;
}

/**
 * Newsletters summary
 * 
 * @param {Account} account
 * @return {string} content
 */
 function createNewsletters(account) {
  return `
  <div>
  newsletters section...
  </div>`;
}

/**
 * Addresses summary
 * 
 * @param {Account} account
 * @return {string} content
 */
 function createAddresses(account) {
  return `
  <div>
  addresses section...
  </div>`;
}

/**
 * Recent orders summary
 * 
 * @param {Account} account
 * @return {string} content
 */
 function createRecentOrders(account) {
  return `
  <div>
  recent orders section...
  </div>`;
}

/**
 * Summary section factory
 * @param {Account} account 
 * @returns {(conf: SummarySection) => string | undefined}
 */
function createSection(account) {
  return function ({ name, action }) {

    /** @type {string} */
    let content;

    switch(name.toLowerCase()) {
      case 'contact information':
        content = createContactInfo(account);
        break;
      case 'newsletters':
        content = createNewsletters(account);
        break;
      case 'addresses':
        content = createAddresses(account);
        break;
      case 'recent orders':
        content = createRecentOrders(account);
        break;
      default:
        console.warn('Unknown account summary section: ', name);
        return;
    }



    return `
    <div class="summary-section">
      <span>
        <h2>${name}</h2>
        ${action ? action : ''}
      </span>
      ${content}
    </div>`;
  }
}

/**
 * Create all summary sections for each name
 * @param {SummarySection[]} confs 
 * @param {Account} account 
 * @returns {HTMLElement}
 */
function createSummary(confs, account) {
  const sections = confs.map(createSection(account)).filter(n => !!n);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = sections.join('\n');
  return wrapper;
}

/**
 * Update account
 * @param {HTMLElement} wrapper
 * @param {SummarySection[]} confs - ordered section configs
 */
function updateAccount(wrapper, confs) {
  const account = getSelectedAccount();
  if(!account) {
    return;
  }

  const summary = createSummary(confs, account);
  console.log('summary: ', summary.innerHTML);
  wrapper.innerHTML = summary.innerHTML;
}


/**
 * loads and decorates the account side nav bar
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  /** @type {SummarySection[]} */
  const confs = [];
  block.querySelectorAll(':scope > div').forEach((node) => {
    console.log('node: ', node);
    const name = node.firstElementChild?.innerText;
    if(!name) {
      return;
    }

    const action = node.lastElementChild;
    action.className = '';
    confs.push({ name, action: action.innerHTML });
  });

  const wrapper = block.parentElement;
  wrapper.removeChild(block);

  updateAccount(wrapper, confs);
  document.body.addEventListener(ACCOUNT_CHANGE_EVT, updateAccount.bind(this, wrapper, confs));
}
