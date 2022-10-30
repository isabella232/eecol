import {
  html, isMobile, signinHref, store,
} from '../../scripts/scripts.js';

const log = logger('account-modal');
const w = window;

/** @param {HTMLDivElement} modal */
function update(modal) {
  // TODO: update header label
  // set visible or hide
  log.log('account modal children: ', modal.children);
}

/** @param {HTMLDivElement} */
export default async function decorate(block) {
  log.debug('decorate()');
  block.append(html`<div class="account-modal hidden"></div>`);
  const portal = document.querySelector('.portal#account-modal');
  const modal = portal.querySelector('.account-modal');

  const toggleModal = async (open) => {
    const action = typeof open === 'undefined' ? 'toggle' : (open && 'remove') || 'add';
    modal.classList[action]('hidden');
  };

  const handlePortalClick = async () => {
    await store.whenReady('Auth');
    const { session } = store.Auth;
    if (!session) {
      log.debug('redirect to signin, no session');
      w.location.href = signinHref();
    } else if (isMobile()) {
      log.debug('redirect to account details, mobile');
      w.location.href = `${store.hrefRoot}/account-details`;
    } else {
      log.debug('toggle modal');
      toggleModal();
    }
  };

  portal.addEventListener('click', handlePortalClick);

  store.on('auth:changed', () => update(modal));
  store.on('account:modal:toggle', handlePortalClick);
  store.load('Auth');

  log.debug('ready');
}
