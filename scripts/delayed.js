// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './helix-web-library.esm.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here
function loadScript(url, callback, type) {
  const $head = document.querySelector('head');
  const $script = document.createElement('script');
  $script.src = url;
  if (type) {
    $script.setAttribute('type', type);
  }
  $head.append($script);
  $script.onload = callback;
  return $script;
}

loadScript('https://alcdn.msauth.net/browser/2.24.0/js/msal-browser.min.js', async () => {
  const { signIn, signOut, getCurrentAccount } = await import('./auth.js');

  document.body.addEventListener('login', () => {
    signIn();
  });

  document.body.addEventListener('logout', () => {
    signOut();
  });

  async function getAccounts(username) {
    const resp = await fetch(`/accounts/account-map.json?id=${username}`);
    const json = await resp.json();
    return json.data.filter((elem) => (elem.email.startsWith('@') && username.endsWith(elem.email)) || username === elem.email);
  }

  // ----< tripod's auth poc >-------------------
  // hack: get sign-in button
  const account = await getCurrentAccount();
  // const account = null;
  // const account = { name: 'uncled', username: 'uncled@adobe.com' };

  const loggedIn = !!sessionStorage.getItem('account');
  if (account && !loggedIn) {
    sessionStorage.setItem('fullname', account.name);
    account.accounts = await getAccounts(account.username);
    sessionStorage.setItem('account', JSON.stringify(account));
    const updateEvent = new Event('login-update');
    document.body.dispatchEvent(updateEvent);
  }

  if (!account && loggedIn) {
    sessionStorage.removeItem('fullname');
    sessionStorage.removeItem('account');
    const updateEvent = new Event('login-update');
    document.body.dispatchEvent(updateEvent);
  }

  // ----< eof tripod's auth poc >-------------------
});
