/* global msal */

const { protocol, host } = new URL(window.location.href);
const redirectUri = `${protocol}//${host}/login.html`;

/**
 * Authentication Type
 * @typedef {Object} Authentication
 * @property {string} homeAccountId Home account Id
 * @property {string} environment Auth environment
 * @property {string} tenantId The tenant ID of the Azure AD tenant
 * @property {string} username email of the user
 * @property {string} localAccountId Local account id
 * @property {string} name Display name
 * @property {Object} idTokenClaims The claims in the ID token
 * @property {Account[]} accounts Other accounts associated with the user
 * @property {Object} accountsById Dictionary of user accounts
 */

/**
 * Account Type
 * @typedef {Object} Account
 * @property {string} email
 * @property {string} accountId
 * @property {string} accountName
 * @property {string} config
 * @property {string[]} config.Categories
 */

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
        if (containsPii) {
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

const loginRequest = {
  scopes: ['User.Read'],
};

const ms = new msal.PublicClientApplication(msalConfig);

let username = '';

async function selectAccount() {
  const currentAccounts = ms.getAllAccounts();
  if (currentAccounts.length === 0) {
    console.warn('no accounts?');
  } else if (currentAccounts.length > 1) {
    // Add your account choosing logic here
    console.warn('Multiple accounts detected.');
  } else if (currentAccounts.length === 1) {
    username = currentAccounts[0].username;
    // await showWelcomeMessage(currentAccounts[0]);
    return currentAccounts[0];
  }
  return null;
}

export function signIn() {
  ms.loginRedirect(loginRequest);
}

export async function signOut() {
  const logoutRequest = {
    account: ms.getAccountByUsername(username),
    postLogoutRedirectUri: msalConfig.auth.redirectUri,
    // Return false if you would like to stop navigation after local logout
    onRedirectNavigate: () => false,
  };
  ms.logoutRedirect(logoutRequest);
}

async function getTokenRedirect(request) {
  request.account = ms.getAccountByUsername(username);
  try {
    return await ms.acquireTokenSilent(request);
  } catch (e) {
    console.warn('silent token acquisition fails. acquiring token using redirect');
    if (e instanceof msal.InteractionRequiredAuthError) {
      // fallback to interaction when silent call fails
      return ms.acquireTokenRedirect(request);
    }
    console.warn(e);
    return null;
  }
}

export async function getToken() {
  return getTokenRedirect(loginRequest);
}

export async function getCurrentAccount() {
  try {
    const response = await ms.handleRedirectPromise();
    if (response) {
      console.log('handle redirect response -> ', response);
      username = response.account.username;
      return response.account;
    }
    return await selectAccount();
  } catch (e) {
    console.error(e);
  }
  return null;
}

ms.addEventCallback((message) => {
  // console.log('event', message);
  if (message.eventType === msal.EventType.LOGOUT_SUCCESS) {
    window.location.reload();
  }
});
