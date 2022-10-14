// eslint-disable-next-line import/no-cycle
import {
  sampleRUM,
} from './helix-web-library.esm.js';

// eslint-disable-next-line import/no-cycle
import { getCurrentAccount } from './auth.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

async function getAccounts(username) {
  const resp = await fetch(`/accounts/account-map.json?id=${username}`);
  const json = await resp.json();
  const accounts = json.data.filter((elem) => (elem.email.startsWith('@') && username.endsWith(elem.email)) || username === elem.email);
  for (let i = 0; i < accounts.length; i += 1) {
    const account = accounts[i];
    // eslint-disable-next-line no-await-in-loop
    const actResp = await fetch(`/accounts/${account.accountId}.json`);
    // eslint-disable-next-line no-await-in-loop
    const actConfig = await actResp.json();
    account.config = {};
    actConfig.data.forEach((row) => {
      let value = row.Value;
      if (value.includes('\n')) value = value.split('\n');
      account.config[row.Key] = value;
    });
  }
  return accounts;
}

// ----< tripod's auth poc >-------------------
// hack: get sign-in button
const account = await getCurrentAccount();
// const account = null;

const loggedIn = !!sessionStorage.getItem('account');
if (account && !loggedIn) {
  sessionStorage.setItem('fullname', account.name);
  account.accounts = await getAccounts(account.username);
  account.accountsById = {};
  account.accounts.forEach((acct) => {
    account.accountsById[acct.accountId] = acct;
  });
  sessionStorage.setItem('account', JSON.stringify(account));
  const updateEvent = new Event('login-update');
  document.body.dispatchEvent(updateEvent);
  const accountChange = new Event('account-change');
  document.body.dispatchEvent(accountChange);
}

if (!account && loggedIn) {
  sessionStorage.removeItem('fullname');
  sessionStorage.removeItem('account');
  const updateEvent = new Event('login-update');
  document.body.dispatchEvent(updateEvent);
  const accountChange = new Event('account-change');
  document.body.dispatchEvent(accountChange);
}

const ready = new Event('auth-ready');
document.body.dispatchEvent(ready);

//   // ----< eof tripod's auth poc >-------------------
// });
