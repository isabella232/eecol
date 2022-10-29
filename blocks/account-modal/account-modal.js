import { html, isMobile, store } from '../../scripts/scripts.js';

const log = logger('account-modal');

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
    log.info('handlePortalClick: ', store.Auth);
    await store.whenReady('Auth');
    const { session } = store.Auth;
    log.info('handlePortalClick session: ', session);

    if (!session) {
      window.location.href = `${store.hrefRoot}/signin`;
    } else if (isMobile() || !session) {
      window.location.href = `${store.hrefRoot}/account-details`;
    } else {
      toggleModal();
    }
  };

  portal.addEventListener('click', handlePortalClick);

  store.on('auth:changed', () => update(modal));
  store.on('account:modal:toggle', handlePortalClick);
  store.load('Auth');

  log.debug('ready');
}
