/* global msal */

// eslint-disable-next-line import/no-cycle
import { loadScript } from './helix-web-library.esm.js';
// eslint-disable-next-line import/no-cycle
import { isLoginInProgress } from './scripts.js';

const MSAL_URL = 'https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js';

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

export async function getToken() {
  const data = await getTokenRedirect(loginRequest);
  return data;
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

  return resp.json();
}

/**
 * @param {string} [token] - optional ActiveDirectory token
 */
export async function getMulesoftToken(token) {
  // eslint-disable-next-line no-param-reassign
  token = token || await getToken();
  const data = await signInAPI(token);
  return data.mulesoftToken;
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
  await ms.handleRedirectPromise();
}

/**
 * Called from LOGIN_SUCCESS event
 */
export async function completeSignIn() {
  const msData = await ms.handleRedirectPromise();

  try {
    // sets auth cookie for inventory & pricing
    await signInAPI(msData.accessToken);
  } catch (e) {
    rejectLogin(e);
  }

  resolveLogin(msData);
}

async function init() {
  console.debug('[auth] init()');
  if (typeof msal === 'undefined') {
    await loadMSAL();
  }

  ms = new msal.PublicClientApplication(msalConfig);
  await ms.initialize();

  loginPromise = new Promise((resolve, reject) => {
    resolveLogin = resolve;
    rejectLogin = reject;
  });
  if (!isLoginInProgress()) {
    resolveLogin();
  }
}

await init().finally(() => {
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
});
