import {
  getSelectedAccount,
  storeUserData,
} from '../../scripts/scripts.js';
import { retrieve, addressTile } from '../account-summary/account-summary.js'; // used for mock data on initialization

const ACCOUNT_CHANGE_EVT = 'account-change';

const FORM_DATA = [{
  // Label: 'Name',
  Field: 'name',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'Name',
},
// {
//   // Label: 'Company',
//   Field: 'company',
//   Type: 'text',
//   Editable: false,
//   Placeholder: 'Company'
// },
{
  // Label: 'Street',
  Field: 'street',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'Street',
}, {
  // Label: 'City',
  Field: 'city',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'City',
}, {
  // Label: 'State',
  Field: 'state',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'State',
}, {
  // Label: 'Zip/Postal Code',
  Field: 'zip',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'Zip/Postal Code',
}, {
  // Label: 'Country',
  Field: 'country',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'Country',
}, {
  // Label: 'Phone',
  Field: 'phone',
  Type: 'text',
  Mandatory: true,
  Placeholder: 'Phone Number',
}, {
  Label: 'Set as Default',
  Field: 'is_default',
  Type: 'checkbox',
}];

/**
 * @typedef {import('../account-summary/account-summary.js').Account} Account
 * @typedef {import('../account-summary/account-summary.js').UserAccount} UserAccount
 * @typedef {import('../account-summary/account-summary.js').Address} Address
 * @typedef {import('../account-summary/account-summary.js').ContactInfo} ContactInfo
 */

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
  if (fd.Editable === false) {
    input.setAttribute('disabled', true);
  }
  if (typeof fd.Value !== 'undefined') {
    if (input.type === 'checkbox') {
      input.checked = fd.Value;
    } else {
      input.value = fd.Value;
    }
  }
  return input;
}

function createField(fd) {
  const fieldWrapper = document.createElement('div');
  const style = fd.Style ? ` form-${fd.Style}` : '';
  const fieldId = `form-${fd.Field}-wrapper${style}`;
  fieldWrapper.className = fieldId;
  fieldWrapper.classList.add('field-wrapper');
  if (fd.Label) {
    fieldWrapper.append(createLabel(fd));
  }
  fieldWrapper.append(createInput(fd));
  return fieldWrapper;
}

/**
 * Create address form
 * @param {Address} address
 * @param {boolean} [editing=false]
 * @returns {HTMLFormElement}
 */
function addressForm(address, editing = false) {
  const form = document.createElement('form');
  const data = JSON.parse(JSON.stringify(FORM_DATA));
  data.forEach((fd) => {
    if (!editing) {
      fd.Editable = false;
    }
    fd.Value = address[fd.Field];
    const field = createField(fd);
    form.append(field);
  });

  return form;
}

/**
 * Extract data from form
 * @param {HTMLFormElement} form
 */
function getFormData(form) {
  const data = {};
  [...form.elements].forEach((input) => {
    if (input.type === 'checkbox') {
      data[input.id] = input.checked;
    } else {
      data[input.id] = input.value;
    }
  });
  return data;
}

/**
 * Update page with account or view change
 * @param {HTMLElement} wrapper
 */
function update(wrapper) {
  /** @type {Account} */
  const account = getSelectedAccount();

  if (!account) {
    return;
  }

  /** @type {Address[]} */
  const raw = retrieve(account, 'addresses');
  const addresses = JSON.parse(JSON.stringify(raw));

  // eslint-disable-next-line no-use-before-define
  const view = addressListView(wrapper, account, addresses, window.location.hash === '#edit');
  if (wrapper.firstChild) {
    wrapper.replaceChild(view, wrapper.firstChild);
  } else {
    wrapper.appendChild(view);
  }
}

/**
 * Create address form
 * @param {HTMLElement} wrapper
 * @param {Account} account
 * @param {boolean} editing
 * @param {Address} address
 * @param {number} index
 * @param {Address[]} addresses
 * @returns {HTMLElement}
 */
function addressView(wrapper, account, editing, address, index, addresses) {
  const container = document.createElement('div');
  container.classList.add('address-view');

  const actionContainer = document.createElement('div');
  actionContainer.classList.add('actions');

  if (editing) {
    const form = addressForm(address, editing);
    container.appendChild(form);

    const action = document.createElement('button');
    action.innerText = 'Save';
    action.onclick = () => {
      const data = getFormData(form);
      let newData;
      if (data.is_default) {
        newData = [...addresses.slice(0, index).map((a) => {
          a.is_default = false;
          return a;
        }),
        data,
        ...addresses.slice(index + 1).map((a) => {
          a.is_default = false;
          return a;
        })];
      } else {
        newData = [...addresses.slice(0, index), data, ...addresses.slice(index + 1)];
      }
      storeUserData('addresses', newData);
      window.location.hash = window.location.hash.replace(/#edit=[^?|&]*/, '');
      update(wrapper);
    };
    actionContainer.appendChild(action);
  } else {
    const tile = document.createElement('div');
    tile.innerHTML = addressTile(address);
    container.appendChild(tile.firstElementChild);

    let action = document.createElement('button');
    action.classList.add('secondary');
    action.innerText = 'Edit';
    action.onclick = () => {
      window.location.hash = `#edit=${index}`;
      update(wrapper);
    };
    actionContainer.appendChild(action);

    if (!address.is_default) {
      action = document.createElement('button');
      action.classList.add('negative');
      action.innerText = 'Delete';
      action.onclick = () => {
        const newData = [...addresses.slice(0, index), ...addresses.slice(index + 1)];
        storeUserData('addresses', newData);
        update(wrapper);
      };
      actionContainer.appendChild(action);
    }
  }

  container.appendChild(actionContainer);
  return container;
}

/**
 * Create address list view
 * @param {HTMLElement} wrapper
 * @param {Account} account
 * @param {Address[]} addresses
 * @returns {HTMLElement}
 */
function addressListView(wrapper, account, addresses) {
  const container = document.createElement('div');
  container.classList.add('address-list');

  let editIndex;
  const match = window.location.hash.match(/#edit=([^?|&]*)/, '');
  if (match?.length > 0) {
    editIndex = parseInt(match[1], 10);
  }

  addresses.forEach((addr, index) => {
    const view = addressView(wrapper, account, editIndex === index, addr, index, addresses);
    container.appendChild(view);
  });

  if (editIndex === addresses.length) {
    // adding an address
    const view = addressView(wrapper, account, true, {}, addresses.length, addresses);
    container.appendChild(view);
  }

  const addButton = document.createElement('button');
  addButton.innerText = 'New Address';
  addButton.onclick = () => {
    window.location.hash = `#edit=${addresses.length}`;
    update(wrapper);
  };
  container.appendChild(addButton);

  return container;
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
