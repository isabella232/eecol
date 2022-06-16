import { 
  getSelectedAccount, 
  getUserAccount, 
  retrieveUserData,
  storeUserData
} from "../../scripts/scripts.js";

const ACCOUNT_CHANGE_EVT = 'account-change';


/**
 * @typedef {Object} AccountConfig
 * @property {string[]} Categories
 */

/**
 * @typedef {Object} Account
 * @property {string} email
 * @property {string} accountId
 * @property {string} accountName
 * @property {AccountConfig} config
 */

/**
 * @typedef {Object} UserAccount
 * @property {Account[]} accounts
 * @property {Record<string, Account>} accountsById
 * @property {string} environment
 * @property {string} homeAccountId
 * @property {string} localAccountId
 * @property {string} name
 * @property {string} tenantId
 * @property {string} username
 */

/**
 * @typedef {Object} Address
 * @property {string} id
 * @property {string} name
 * @property {string} company
 * @property {string} street
 * @property {string} city
 * @property {string} state
 * @property {string} zip
 * @property {string} country
 * @property {boolean} is_default
 */

/**
 * @typedef {Object} ContactInfo
 * @property {string} email
 * @property {string} name
 * @property {string} company
 * @property {string} phone
 * @property {Address} address
 */

/**
 * @typedef {Object} SummarySection
 * @property {string} name - section name
 * @property {string|undefined} action - html string for link on header
 */

/**
 * @param {Account} account
 * @returns {Address[]}
 */
function defaultAddresses(account) {
  /** @type {UserAccount} */
  const user = getUserAccount() ?? {};

  /** @type {Address[]} */
  const data = [{
    id: 0,
    name: user.name,
    company: account.accountName,
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    is_default: true
  }];
  // storeUserData('addresses', data);
  return data;
}

/**
 * @param {Account} account
 * @returns {ContactInfo}
 */
function defaultContactInfo(account) {
  /** @type {UserAccount} */
  const user = getUserAccount() ?? {};
  console.log('user: ', user);
  const data = {
    email: user.username,
    name: user.name,
    company: account.accountName,
    phone: '',
    address: retrieve(account, 'addresses')[0]
  };

  // storeUserData('contactInfo', data);
  return data;
}

/**
 * @param {Account} account
 * @param {string} key
 * @returns {ContactInfo}
 */
function retrieve(account, key) {
  console.log('retrieve: ', account, key);
  const data = retrieveUserData(key);
  if(data) {
    return data;
  }

  switch(key) {
    case 'contactInfo':
      return defaultContactInfo(account);
    case 'addresses':
      return defaultAddresses(account);
  }
}

/**
 * Contact info summary
 * 
 * @param {Account} account
 * @return {string} content
 */
function createContactInfo(account) {
  console.log('createContactInfo: ', account);
  /** @type {ContactInfo} */
  const data = retrieve(account, 'contactInfo');
  console.log('data: ', data);

  return `
  <div>
    <p>${data.email}</p>
    <p>${data.name}</p>
    <p>${data.company}</p>
    <p>${data.phone}</p>
    <p>${data.address.street}</p>
    <p>${data.address.city}, ${data.address.state}, ${data.address.zip}</p>
    <p>${data.address.country}</p>
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
    <p>You aren't subscribed to any newsletters</p>
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
