import {
  checkProductsInCatalog,
  formatCurrency,
  getSelectedAccount,
  store,
  getPlaceholders,
  isMobile,
  html,
} from '../../scripts/scripts.js';

const d = document;

/**
 * @param {HTMLDivElement} modal
 */
async function updateCartDisplay(modal) {
  const ph = await getPlaceholders();

  const createCartItem = (item, inCatalog) => {
    const { cart, hrefRoot } = store;
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
    const { cart, region } = store;
    if (!cart.items.length) {
      return html`
        <div class="cart-mini">
          <span class="empty-cart-message">${ph.emptyCartMessage}</span>
        </div>`;
    }

    /* check for account settings */
    const account = getSelectedAccount();
    const skus = cart.items.map((item) => item.sku);
    const hints = cart.items.map((item) => item.details);
    const inCatalog = checkProductsInCatalog(skus, account, hints);

    let button = `<a class="button primary" href="${region}/checkout">${ph.checkout}</a>`;
    if (!account) button = `<a class="button primary disabled" href="${region}/login">${ph.signInToCheckOut}</a>`;
    if (!inCatalog.every((e) => e)) button = `<a class="button primary disabled" href="#">${ph.invalidCart}</a>`;

    const div = html`
    <div class="cart-mini">
      <div class="cart-header">
        <div class="cart-numitems">
          ${cart.totalItems} ${cart.totalItems === 1 ? ph.item : ph.items}
        </div>
        <div class="cart-subtotal">
          ${formatCurrency(cart.totalAmount, ph.currency)}
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
    cart.items.forEach((item, i) => {
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

export class Cart {
  constructor() {
    this.portal = d.querySelector('.portal#cart');
    this.modal = this.portal.querySelector('.cart-modal');
    this.maxItem = 9;
    this.items = [];
    this.load();
    this.attachListeners();
  }

  attachListeners() {
    d.body.addEventListener('account-change', () => updateCartDisplay(this.modal));

    this.portal.addEventListener('click', () => {
      if (isMobile()) {
        window.location.href = `${store.hrefRoot}/cart-details`;
      } else {
        this.toggleModal();
      }
    });
  }

  toggleModal(open) {
    const action = typeof open === 'undefined' ? 'toggle' : (open && 'remove') || 'add';
    this.modal.classList[action]('hidden');
  }

  log() {
    console.log(this.items);
  }

  remove(sku) {
    const index = this.items.findIndex((item) => sku === item.sku);
    this.items.splice(index, 1);
    this.update();
  }

  canAdd(sku, details, price, quantity = 1) {
    /* check for account */
    const account = getSelectedAccount();
    if (!checkProductsInCatalog([sku], account, [details])[0]) return false;

    /* check for quantity */
    let total = quantity;
    const item = this.find(sku);
    if (item) total += item.quantity;
    return (total <= this.maxItem);
  }

  add(sku, details, price, quantity = 1) {
    const item = this.find(sku);
    if (item) {
      this.plus(item.sku, quantity);
    } else {
      this.items.push({
        sku,
        details,
        price,
        quantity,
      });
    }
    this.update();
  }

  find(sku) {
    return this.items.find((item) => sku === item.sku);
  }

  plus(sku, quantity = 1) {
    const index = this.items.findIndex((item) => sku === item.sku);
    if (this.items[index].quantity + quantity <= this.maxItem) {
      this.items[index].quantity += quantity;
    }
    this.update();
  }

  minus(sku) {
    const index = this.items.findIndex((item) => sku === item.sku);
    this.items[index].quantity -= 1;
    if (!this.items[index].quantity) this.remove(sku);
    this.update();
  }

  setQuantity(sku, q) {
    const index = this.items.findIndex((item) => sku === item.sku);
    this.line_items[index].quantity = q;
    this.update();
  }

  get totalAmount() {
    let total = 0;
    this.items.forEach((item) => {
      total += item.price * item.quantity;
    });
    return (total);
  }

  get totalItems() {
    let total = 0;
    this.items.forEach((item) => {
      total += item.quantity;
    });
    return (total);
  }

  clear() {
    this.items = [];
    this.update();
  }

  update() {
    localStorage.setItem('cart', JSON.stringify({ lastUpdate: new Date(), items: this.items }));
    updateCartDisplay(this.modal);
  }

  load() {
    const cartobj = JSON.parse(localStorage.getItem('cart'));
    this.items = [];

    if (cartobj && cartobj.items) {
      // validate
      cartobj.items.forEach((item) => {
        // if (this.checkCatalog(item)) {
        this.items.push(item);
        // }
      });
    }
    this.update();
  }
}

export default function decorate(block) {
  console.debug('[cart] decorate()');
  block.append(html`<div class="cart-modal hidden"></div>`);
  if (!store.isReady('cart')) {
    store.registerModule('cart', new Cart());
  }
}
