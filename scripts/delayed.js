// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './scripts.js';

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

  // ----< tripod's auth poc >-------------------
  // hack: get sign-in button
  const nav = document.querySelector('nav');
  console.log(nav);
  const authNavi = nav.children[1].children[1];
  while (authNavi.firstChild) {
    authNavi.firstChild.remove();
  }
  const account = await getCurrentAccount();
  if (account) {
    authNavi.appendChild(document.createTextNode('Welcome '));
    const btnProfile = document.createElement('a');
    authNavi.appendChild(btnProfile);
    btnProfile.innerText = account.name;
    btnProfile.href = '/profile.html';
    authNavi.appendChild(document.createTextNode(' | '));

    const btnSignOut = document.createElement('a');
    authNavi.appendChild(btnSignOut);
    btnSignOut.innerText = 'Sign out';
    btnSignOut.style.cursor = 'pointer';
    btnSignOut.onclick = signOut;
  } else {
    const btnSignIn = document.createElement('a');
    authNavi.appendChild(btnSignIn);
    btnSignIn.innerText = 'Sign in';
    btnSignIn.onclick = signIn;
    btnSignIn.style.cursor = 'pointer';
    authNavi.appendChild(document.createTextNode(' or '));
    const btnRegister = document.createElement('a');
    authNavi.appendChild(btnRegister);
    btnRegister.href = '/content/eecol/ca/en/register';
    btnRegister.innerText = 'Register';
    authNavi.appendChild(document.createTextNode(' CAD'));
  }
  // ----< eof tripod's auth poc >-------------------
});
