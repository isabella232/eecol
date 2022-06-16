import { 
  getSelectedAccount, 
  getUserAccount, 
  retrieveUserData,
  storeUserData
} from "../../scripts/scripts.js";
import { retrieve } from '../account-summary/account-summary.js'; // used for mock data on initialization

const ACCOUNT_CHANGE_EVT = 'account-change';

const FORM_DATA = [{
  Label: 'Email',
  Field: 'email',
  Type: 'text',
  Editable: false,
  Placeholder: 'name@company.com'
}, {
  Label: 'Company',
  Field: 'company',
  Type: 'text',
  Editable: false,
  Placeholder: 'ACME Industries'
}, {
  Label: 'Name',
  Field: 'name',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'First McLast'
}, {
  Label: 'Phone',
  Field: 'phone',
  Type: 'text',
  Mandatory: true,
  Placeholder: '555-123-1234'
}];

/**
 * @typedef {import('../account-summary/account-summary.js').Account} Account
 * @typedef {import('../account-summary/account-summary.js').UserAccount} UserAccount
 * @typedef {import('../account-summary/account-summary.js').Address} Address
 * @typedef {import('../account-summary/account-summary.js').ContactInfo} ContactInfo
 */

/** @type {Record<string, ContactInfo>} */
const editSessionByAccountId = {};

function createLabel(fd) {
  const label = document.createElement('label');
  label.setAttribute('for', fd.Field);
  label.textContent = fd.Label;
  if (fd.Mandatory === 'x') {
    label.classList.add('required');
  }
  return label;
}

function createInput(fd) {
  const input = document.createElement('input');
  input.type = fd.Type;
  input.id = fd.Field;
  input.setAttribute('placeholder', fd.Placeholder);
  if (fd.Mandatory === 'x') {
    input.setAttribute('required', 'required');
  }
  if(fd.Editable === false) {
    input.setAttribute('disabled', true);
  }
  if(typeof fd.Value !== 'undefined') {
    input.value = fd.Value;
  }
  return input;
}

function createField(fd) {
  const fieldWrapper = document.createElement('div');
  const style = fd.Style ? ` form-${fd.Style}` : '';
  const fieldId = `form-${fd.Field}-wrapper${style}`;
  fieldWrapper.className = fieldId;
  fieldWrapper.classList.add('field-wrapper');
  fieldWrapper.append(createLabel(fd));
  fieldWrapper.append(createInput(fd));
  return fieldWrapper;
}

/**
 * Create account info form
 * @param {ContactInfo} info
 * @param {boolean} [editing=false]
 * @returns {HTMLFormElement}
 */
function accountInfoForm(info, editing = false) {
  const form = document.createElement('form');
  const data = JSON.parse(JSON.stringify(FORM_DATA));
  for(const fd of data) {
    if(!editing) {
      fd.Editable = false;
    }
    fd.Value = info[fd.Field];
    const field = createField(fd);
    form.append(field);
  }

  return form;
}

/**
 * Extract data from form
 * @param {HTMLFormElement} form 
 */
function getFormData(form) {
  const data = {};
  [...form.elements].forEach((input) => {
    data[input.id] = input.value;
  });
  return data;
}

/**
 * Create account info form
 * @param {HTMLElement} wrapper
 * @param {Account} account 
 * @param {ContactInfo} info
 * @param {boolean} [editing=false]
 * @returns {HTMLElement}
 */
function accountInfoView(wrapper, account, info, editing = false) {
  const container = document.createElement('div');
  const form = accountInfoForm(info, editing);
  container.appendChild(form);

  const action = document.createElement('button');
  if(editing) {
    action.innerText = 'Save';
    action.onclick = () => {
      const data = getFormData(form);
      editSessionByAccountId[account.accountId] = data;
      storeUserData('contactInfo', data);
      window.location.hash = window.location.hash.replace('#edit', '');
      update(wrapper);
    }

    form.onchange = () => {
      const data = getFormData(form);
      editSessionByAccountId[account.accountId] = data;
    }
  } else {
    action.innerText = 'Edit';
    action.onclick = () => {
      window.location.hash = '#edit';
      update(wrapper);
    }
  }
  container.appendChild(action);

  return container;
}

/**
 * Update page with account or view change
 * @param {HTMLElement} wrapper
 */
function update(wrapper) {
  /** @type {Account} */
  const account = getSelectedAccount();

  if(!account) {
    return;
  }

  /** @type {ContactInfo} */
  let info = editSessionByAccountId[account.accountId];
  if(!info) {
    const raw = retrieve(account, 'contactInfo');
    info = JSON.parse(JSON.stringify(raw));
    editSessionByAccountId[account.accountId] = info;
  }

  const view = accountInfoView(wrapper, account, info, window.location.hash === '#edit');
  if(wrapper.firstChild) {
    wrapper.replaceChild(view, wrapper.firstChild);
  } else {
    wrapper.appendChild(view);
  }
}


/**
 * loads and decorates the account information viewer/editor
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const wrapper = block.parentElement;
  wrapper.removeChild(block);

  update(wrapper);
  document.body.addEventListener(ACCOUNT_CHANGE_EVT, update.bind(this, wrapper));
}
