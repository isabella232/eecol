/* global msal */

const msalConfig = {
  auth: {
    clientId: '83a36355-ad17-4ed0-8701-e99a3020f86a',
    authority: 'https://login.microsoftonline.com/common',
    // redirectUri: 'http://localhost:3000/login.html',
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

export async function showWelcomeMessage(account) {
  document.getElementById('info').innerText = JSON.stringify(account, null, 2);
  document.getElementById('welcome').innerText = `Welcome: ${account.name} <${account.username}>`;
  await showProfile();
  await showProfilePicture();
}

async function selectAccount() {
  const currentAccounts = ms.getAllAccounts();
  if (currentAccounts.length === 0) {
    return;
  } else if (currentAccounts.length > 1) {
    // Add your account choosing logic here
    console.warn('Multiple accounts detected.');
  } else if (currentAccounts.length === 1) {
    username = currentAccounts[0].username;
    await showWelcomeMessage(currentAccounts[0]);
  }
}

async function handleResponse(response) {
  console.log('response', response);
  if (response !== null) {
    username = response.account.username;
    await showWelcomeMessage(response.account);
  } else {
    await selectAccount();
  }
}

export function signIn() {
  ms.loginRedirect(loginRequest);
}

export async function signOut() {
  const logoutRequest = {
    account: ms.getAccountByUsername(username),
    postLogoutRedirectUri: msalConfig.auth.redirectUri,
    onRedirectNavigate: (url) => {
      // Return false if you would like to stop navigation after local logout
      return false;
    },
  };
  ms.logoutRedirect(logoutRequest);
}

export async function getTokenRedirect(request) {
  request.account = ms.getAccountByUsername(username);
  return ms.acquireTokenSilent(request)
    .catch(error => {
      console.warn('silent token acquisition fails. acquiring token using redirect');
      if (error instanceof msal.InteractionRequiredAuthError) {
        // fallback to interaction when silent call fails
        return ms.acquireTokenRedirect(request);
      } else {
        console.warn(error);
      }
    });
}

async function showProfile() {
  const { accessToken } = await getTokenRedirect(loginRequest);
  const res = await fetch('https://graph.microsoft.com/v1.0/me/', {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  console.log(res);
  const json = await res.json();
  console.log(json);
  document.getElementById('profile').innerText = JSON.stringify(json, null, 2);
}

async function showProfilePicture() {
  const { accessToken } = await getTokenRedirect(loginRequest);
  const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const blobUrl = URL.createObjectURL(await res.blob());
  document.getElementById('avatar')
    .setAttribute('src', blobUrl);
}

ms.addEventCallback((message) => {
  // Update UI or interact with EventMessage here
  if (message.eventType === msal.EventType.LOGOUT_SUCCESS) {
    console.log(message.payload);
    window.location.reload();
  }
});

ms.handleRedirectPromise()
  .then(handleResponse)
  .catch((error) => {
    console.error(error);
  });

