import {
  checkProductsInCatalog,
  formatCurrency,
  getSelectedAccount,
  store,
  getPlaceholders,
  isMobile,
  html,
} from '../../scripts/scripts.js';

const log = logger('cart-modal');

/**
 * @param {HTMLDivElement} modal
 */
async function update(modal) {
  const ph = await getPlaceholders();
  const { hrefRoot, cart } = store;

  const createCartItem = (item, inCatalog) => {
    const { details } = item;

    const createMods = (keys) => keys.map((key) => (details[key] ? `<p>${ph[key]} : ${details[key]}</p>` : '')).join('');

    const div = html`
    <div class="cart-item${!inCatalog ? ' cart-item-invalid' : ''}">
      <div class="cart-item-image">
        <img src="${details.image}">
      </div>
      <div class="cart-item-details">
          <h6><a href="${hrefRoot}/products/${details.sku.toLowerCase()}">
            ${details.name}
          </a></h6>
          ${createMods(['color', 'size'])}
          <p>${ph.qty} : ${item.quantity}</p>
          <p>${formatCurrency(item.price, ph.currency)} ${ph.ea}</p>
      </div>
      <div class="cart-item-controls">
        <a class="remove-btn">
          <img src="/icons/trashcan.svg" class="icon icon-trashcan">
        </a>
      </div>
    </div>`;
    const remove = div.querySelector('.remove-btn');
    remove.addEventListener(('click'), () => cart.remove(item.sku));
    return div;
  };

  const createMiniCart = () => {
    const { Cart, region } = store;
    if (!Cart.items.length) {
      return html`
        <div class="cart-mini">
          <span class="empty-cart-message">${ph.emptyCartMessage}</span>
        </div>`;
    }

    /* check for account settings */
    const account = getSelectedAccount();
    const skus = Cart.items.map((item) => item.sku);
    const hints = Cart.items.map((item) => item.details);
    const inCatalog = checkProductsInCatalog(skus, account, hints);

    let button = `<a class="button primary" href="${region}/checkout">${ph.checkout}</a>`;
    if (!account) button = `<a class="button primary disabled" href="${region}/login">${ph.signInToCheckOut}</a>`;
    if (!inCatalog.every((e) => e)) button = `<a class="button primary disabled" href="#">${ph.invalidCart}</a>`;

    const div = html`
    <div class="cart-mini">
      <div class="cart-header">
        <div class="cart-numitems">
          ${Cart.totalItems} ${Cart.totalItems === 1 ? ph.item : ph.items}
        </div>
        <div class="cart-subtotal">
          ${formatCurrency(Cart.totalAmount, ph.currency)}
        </div>
      </div>
      <div class="cart-items"></div>
      <div class="cart-controls">
        <p><a class="button secondary" href="${region}/cart-details">
          ${ph.viewCart}
        </a></p>
        <p>${button}</p>
      </div>
    </div>`;

    const cartItems = div.querySelector('.cart-items');
    Cart.items.forEach((item, i) => {
      cartItems.append(createCartItem(item, inCatalog[i]));
    });
    return div;
  };

  const miniCart = createMiniCart();
  if (modal.firstChild) {
    modal.firstChild.replaceWith(miniCart);
  } else {
    modal.append(miniCart);
  }
}

export default async function decorate(block) {
  log.debug('decorate()');
  block.append(html`<div class="cart-modal hidden"></div>`);
  const portal = document.querySelector('.portal#cart-modal');
  const modal = portal.querySelector('.cart-modal');

  const toggleModal = (open) => {
    const action = typeof open === 'undefined' ? 'toggle' : (open && 'remove') || 'add';
    modal.classList[action]('hidden');
  };

  portal.addEventListener('click', () => {
    if (isMobile()) {
      window.location.href = `${store.hrefRoot}/cart-details`;
    } else {
      toggleModal();
    }
  });

  store.on('cart:changed', () => update(modal));
  store.on('cart:modal:toggle', toggleModal);
  await store.load('Cart');
}
