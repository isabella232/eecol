import { checkProductsInCatalog } from '../scripts.js';

const log = logger('Cart');

export class Cart {
  constructor(store) {
    /** @type {Store} */
    this.store = store;
    this.maxItem = 9;
    this.items = [];
    this.load();
    this.attachListeners();
  }

  attachListeners() {
    // TODO: watch for auth changes
  }

  log() {
    log.log(this.items);
  }

  remove(sku) {
    const index = this.items.findIndex((item) => sku === item.sku);
    this.items.splice(index, 1);
    this.update();
  }

  canAdd(sku, details, price, quantity = 1) {
    /* check for account */
    const { session } = this.store.Auth;
    if (!checkProductsInCatalog([sku], session, [details])[0]) return false;

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
    this.store.emit('cart:changed');
  }

  async load() {
    // TODO: fetch cart state from commerce

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

/**
 * @type {LazyModule<Cart>}
 */
export default async function load(store) {
  const cart = new Cart(store);
  await cart.load();
  return cart;
}
