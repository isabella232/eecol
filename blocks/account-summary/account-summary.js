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
 * @property {string} phone
 * @property {boolean} is_default
 */

/**
 * @typedef {Object} ContactInfo
 * @property {string} email
 * @property {string} name
 * @property {string} company
 * @property {string} phone
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
    street: '1234 Example Rd.',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
    country: 'USA',
    phone: '555-123-1234',
    is_default: true
  }];
  storeUserData('addresses', data);
  return data;
}

/**
 * @param {Account} account
 * @returns {ContactInfo}
 */
function defaultContactInfo(account) {
  /** @type {UserAccount} */
  const user = getUserAccount() ?? {};
  const data = {
    email: user.username,
    name: user.name,
    company: account.accountName,
    phone: '555-123-1234',
  };

  storeUserData('contactInfo', data);
  return data;
}

/**
 * @param {Account} account
 * @param {string} key
 * @returns {ContactInfo|Address[]|undefined}
 */
export function retrieve(account, key) {
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
  /** @type {ContactInfo} */
  const data = retrieve(account, 'contactInfo');
  const address = retrieve(account, 'addresses').find(addr => addr.is_default) || {};

  return `
  <div class="contact-info">
    <p>${data.email}</p>
    <p>${data.name}</p>
    <p>${data.company}</p>
    <p>${data.phone}</p>
    <p>${address.street}</p>
    <p>${address.city}, ${address.state}, ${address.zip}</p>
    <p>${address.country}</p>
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
  <div class="newsletters">
    <p>You aren't subscribed to any newsletters</p>
  </div>`;
}

/**
 * Make address tile
 * @param {Address} address 
 */
function addressTile(address) {
  return `
  <div class="address-tile">
    ${address.is_default ?
      `<span class="is-default">
        <span class="icon">
          <img src="/icons/circle-check.svg" />
        </span>
        <p>Default address</p>
      </span>`
      :
      ''
    }
    <p><strong>${address.name ?? ''}</strong></p>
    <p>${address.company ?? ''}</p>
    <p>${address.street ?? ''}</p>
    <p>${address.city ?? ''}, ${address.state ?? ''}, ${address.zip ?? ''}, ${address.country ?? ''}</p>
    <p>${address.phone ?? ''}</p>
  </div>
  `;
}

/**
 * Addresses summary
 * 
 * @param {Account} account
 * @return {string} content
 */
 function createAddresses(account) {
   /** @type {Address[]} */
  let addresses = retrieve(account, 'addresses');
  const defaultAddr = addresses.find(addr => addr.is_default);
  addresses = addresses.filter(addr => addr !== defaultAddr).slice(0, 2);
  
  // for testing styles of multiple addresses
  // addresses.push({...defaultAddr, is_default: false});

  return `
  <div class="addresses">
    ${addressTile(defaultAddr)}
    ${addresses.map(addressTile)}
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
  <div class="recent-orders">
    <p>You don't have any recent orders.</p>
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
