/* global msal */

import { loadScript } from '../helix-web-library.esm.js';

const MSAL_URL = 'https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js';
export const AUTH_COOKIE = 'eecol.auth';
export const PROFILE_COOKIE = 'eecol.profile';
export const AD_TOKEN_KEY = 'adToken';

const { protocol, host, hostname } = new URL(window.location.href);
const redirectUri = `${protocol}//${host}/login.html`;
const dev = hostname === 'localhost';

let username = '';
/** @type {import('@azure/msal-browser').PublicClientApplication} */
let ms;
/** @type {(res: AuthenticationResult) => void} */
let resolveLogin;
/** @type {(e: any) => void} */
let rejectLogin;
/** @type {Promise<AuthenticationResult|null>} */
let loginPromise;
/** @type {Promise<void>} */
let msalPromise;
/** @type {AuthState} */
let state = {};

/** @type {RedirectRequest} */
const loginRequest = {
  scopes: ['User.Read'],
};

/** @type {import('@azure/msal-browser').BrowserConfiguration} */
const msalConfig = {
  auth: {
    clientId: '83a36355-ad17-4ed0-8701-e99a3020f86a',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii && !dev) {
          return;
        }
        switch (level) {
          case msal.LogLevel.Error:
            console.error(message);
            return;
          case msal.LogLevel.Info:
            console.info(message);
            return;
          case msal.LogLevel.Verbose:
            console.debug(message);
            return;
          case msal.LogLevel.Warning:
            console.warn(message);
            return;
          default:
            console.log(message);
        }
      },
    },
  },
};

export function loadMSAL() {
  if (msalPromise) return msalPromise;

  msalPromise = new Promise((resolve) => {
    loadScript(MSAL_URL, () => {
      resolve();
    });
  });
  return msalPromise;
}

export async function signIn() {
  console.debug('[auth] signIn()');
  await ms.loginRedirect(loginRequest);
}

export async function signOut() {
  console.debug('[auth] signOut()');
  const logoutRequest = {
    account: ms.getAccountByUsername(username),
    postLogoutRedirectUri: msalConfig.auth.redirectUri,
    // Return false if you would like to stop navigation after local logout
    onRedirectNavigate: () => false,
  };
  await ms.logoutRedirect(logoutRequest);
}

async function selectAccount() {
  const currentAccounts = ms.getAllAccounts();
  if (currentAccounts.length === 0) {
    console.warn('[auth] no accounts?');
  } else if (currentAccounts.length > 1) {
    // Add your account choosing logic here
    console.warn('[auth] multiple accounts detected');
  } else if (currentAccounts.length === 1) {
    username = currentAccounts[0].username;
    // await showWelcomeMessage(currentAccounts[0]);
    return currentAccounts[0];
  }
  return null;
}

async function getTokenRedirect(request) {
  request.account = ms.getAccountByUsername(username);
  try {
    return await ms.acquireTokenSilent(request);
  } catch (e) {
    console.warn('[auth] silent token acquisition fails. acquiring token using redirect');
    if (e instanceof msal.InteractionRequiredAuthError) {
      // fallback to interaction when silent call fails
      return ms.acquireTokenRedirect(request);
    }
    console.warn(e);
    return null;
  }
}

export async function getADToken() {
  const prevAdToken = state.adToken;
  const { accessToken: adToken } = await getTokenRedirect(loginRequest);
  // new AD token means we need a new MS token
  if (!prevAdToken || adToken !== prevAdToken) {
    console.info('[auth] invalidating api auth');
    state.msToken = undefined;
  }
  state.adToken = adToken;
  // save it for later
  window.sessionStorage.setItem(AD_TOKEN_KEY, adToken);
  return adToken;
}

/**
 * @param {string} token - ActiveDirectory token
 * @returns {Promise<APIAuthResult>}
 */
async function signInAPI(token) {
  console.debug('[auth] signInAPI()');

  if (!token) {
    throw Error('cannot authenticate without a token');
  }

  const resp = await fetch('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({
      token,
    }),
  });

  if (!resp.ok) {
    console.error('[auth] failed to login to API: ', resp);
    throw Error(`failed to authenticate (${resp.status})`);
  }

  const data = await resp.json();
  state.msToken = data.access_token;
  return data;
}

function parseCookies() {
  const cookieStr = document.cookie;
  if (!cookieStr) {
    return {};
  }

  const cookies = cookieStr.split(';').map((s) => s.trim());
  const cookieObj = {};
  cookies.forEach((c) => {
    const [key, ...vals] = c.split('=');
    cookieObj[key] = vals.join('=');
  });

  return cookieObj;
}

function getMSTokenFromCookie() {
  const cookies = parseCookies();
  return cookies[AUTH_COOKIE];
}

/**
 * Get a mulesoft token, refresh if AD token has changed
 */
async function getMulesoftToken() {
  const adToken = await getADToken(); // revokes msToken if needed
  if (!state.msToken) {
    console.info('[auth] refreshing api auth');
    const { access_token: msToken } = await signInAPI(adToken);
    state.msToken = msToken;
    return msToken;
  }

  return state.msToken;
}

/**
 * Called from delayed.js
 * @returns {Promise<import('@azure/msal-browser').AccountInfo|null>}
 */
export async function getCurrentAccount() {
  let account;
  try {
    const response = await loginPromise || await ms.handleRedirectPromise();

    if (response) {
      console.debug('[auth] handle redirect response: ', response);
      username = response.account.username;
      account = response.account;
    } else {
      account = await selectAccount();
    }
  } catch (e) {
    console.error('[auth] failed to get current account: ', e);
  }
  return account;
}

/**
 * Called from login.html
 */
export async function completeSignInRedirect() {
  console.debug('[auth] completeSignInRedirect()');
  await ms.handleRedirectPromise();
}

/**
 * Called from LOGIN_SUCCESS event
 */
export async function completeSignIn() {
  console.debug('[auth] completeSignIn()');
  const data = await ms.handleRedirectPromise();

  try {
    state.adToken = data.accessToken;
    // sets auth cookie for inventory & pricing
    state.msToken = await signInAPI(state.adToken);
  } catch (e) {
    console.error('[auth] error signing in: ', e);
    rejectLogin(e);
  }

  resolveLogin(data);
}

async function getAccounts(user) {
  const resp = await fetch(`/accounts/account-map.json?id=${user}`);
  const json = await resp.json();
  const accounts = json.data.filter((elem) => (elem.email.startsWith('@') && user.endsWith(elem.email)) || username === elem.email);
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

/**
 * @returns {LazyModule<'Auth'>}
 */
export default async function load(store) {
  if (typeof msal === 'undefined') {
    await loadMSAL();
  }

  ms = new msal.PublicClientApplication(msalConfig);
  await ms.initialize();

  loginPromise = new Promise((resolve, reject) => {
    resolveLogin = resolve;
    rejectLogin = reject;
  });
  if (!store.isLoginInProgress()) {
    resolveLogin();
  }

  // initialize state
  state = {
    msToken: getMSTokenFromCookie(),
    adToken: window.sessionStorage.getItem(AD_TOKEN_KEY),
  };

  ms.addEventCallback(async (message) => {
    if (message.eventType === msal.EventType.LOGOUT_SUCCESS) {
      window.location.reload();
    }

    if (message.eventType === msal.EventType.LOGIN_SUCCESS) {
      await completeSignIn();
    }
  });

  document.body.addEventListener('login', async () => {
    await signIn();
  });

  document.body.addEventListener('logout', async () => {
    await signOut();
  });

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

  //   // ----< eof tripod's auth poc >-------------------
  // });

  return {
    validate: async () => {
      const muleToken = await getMulesoftToken();
      return !!muleToken;
    },
  };
}
