/* eslint-disable no-nested-ternary */
import {
  getPlaceholders,
  lookupProduct,
  titleCase,
  lookupProductPricing,
  getUserAccount,
  signIn,
  store,
  lookupProductInventory,
} from '../../scripts/scripts.js';

/**
 * @param {ProductInventory} inv
 */
const stockStatus = (inv) => {
  if (inv.cfa) {
    return `<div class="status">
              <span>Call for availability</span>
            </div>`;
  }
  const icon = inv.isAvailable ? '/icons/circle-check.svg' : '/icons/circle-x.svg';
  const msg = inv.isAvailable ? 'In Stock' : 'Out of Stock';
  return `
<div class="status">
  <img class="icon inv-status" src="${icon}">
    <span>${msg}</span>
  <a>View Inventory</a>
</div>`;
};

class ProductView {
  constructor(block) {
    this.block = block;
  }

  async load() {
    try {
      this.sku = window.location.pathname.split('/').pop();
      const product = await lookupProduct(this.sku);
      store.product = product;

      document.title = store.product.name;
      document.dispatchEvent(new CustomEvent('product-loaded'));

      this.ph = await getPlaceholders('/ca/en');
      this.render();
    } catch (error) {
      this.render404();
    }

    document.body.addEventListener('account-change', this.render.bind(this));
  }

  /**
   * Determines if the can add the product to the cart
   */
  enableAddToCart() {
    const addToButton = this.block.querySelector('.cart .action .add-to-cart');
    const notInCatalogLabel = this.block.querySelector('.cart .not-in-catalog');
    const quantityInput = this.block.querySelector('.cart .action input');
    if (!quantityInput) {
      return;
    }
    const quantity = parseInt(quantityInput.value, 2);
    console.log('store.cart: ', store.cart);
    console.log('quantity: ', quantity);
    console.log('store.canAdd: ', store.cart.canAdd(
      store.product.sku,
      store.product,
      store.product.pricing.sellprice * quantity,
      quantity,
    ));

    if (store.cart
        && quantityInput
        && store.cart.canAdd(
          store.product.sku,
          store.product,
          store.product.pricing.sellprice * quantity,
          quantity,
        )
    ) {
      addToButton.disabled = false;
      quantityInput.disabled = false;
      notInCatalogLabel.classList.remove('visible');
    } else {
      addToButton.disabled = true;
      quantityInput.disabled = true;
      notInCatalogLabel.classList.add('visible');
    }
  }

  addToCart() {
    const quantityInput = this.block.querySelector('.cart .action input');
    const quantity = parseInt(quantityInput.value, 2);
    if (store.cart) {
      store.cart.add(
        store.product.sku,
        store.product,
        store.product.pricing.sellprice * quantity,
        quantity,
      );
    }
  }

  /**
   * Render a 404 if we were unable to load the product
   */
  render404() {
    this.block.innerHTML = /* html */`
      <div class="product-heading">
          <h1>Uh-oh.... we were unable to find this product</h1>
      </div>
    `;
  }

  /**
   * Render the core scaffold of the product page
   */
  renderProductScaffolding() {
    this.block.innerHTML = /* html */`
      <div class="product-block">
        <picture><img src="${store.product.image}"></picture>
        <div class="details">
          <div class="manufacturer">${titleCase(store.product.manufacturer)}</div>
          <div class="name"><h3>${store.product.name}</h3></div>
          <div class="catalog">
            <div>MFR #: ${store.product.manufacturer_part_number_brand}</div>
            <div>Part #: ${store.product.sku}</div>
          </div>
        </div>
      </div>
      <div class="product-config">
        <div class="cart"></div>
      </div>
    `;
  }

  /**
   * Render the product overview block
   */
  renderProductOverview() {
    const div = document.createElement('div');
    div.className = 'product-overview';
    div.innerHTML = /* html */`
        <h3>Product Overview</h3>
        <div class="description">${store.product.description}</div>
    `;
    this.block.appendChild(div);
  }

  /**
   * Render the loading animation while we are loading the pricing
   */
  renderPricingLoading() {
    const cartElement = this.block.querySelector('.product-config .cart');
    cartElement.innerHTML = /* html */`
      <div class="cart-loader">
        <div class="dot-flashing"></div>
      </div>`;
  }

  /**
   * Render the sign in block in place of pricing
   */
  renderPricingSignin() {
    const cartElement = this.block.querySelector('.product-config .cart');
    cartElement.innerHTML = /* html */`
      <a class="signin">Sign in for Price</a>
    `;
    cartElement.querySelector('a').addEventListener('click', () => {
      signIn();
    });
  }

  /**
   * Renders the add to cart block
   * @param {ProductInventory} inventory
   * @param {ProductPricing} pricing
   * @returns {string}
   */
  renderAddToCartBlock(inventory, pricing) {
    return /* html */`
      <div class="not-in-catalog">Item not in catalog</div>
      <div class="cost">
        <div class="numericuom">
          ${pricing.currency}$${pricing.unitSellPrice}
        </div>
        <span>/</span>
        <div class="basismeasure">${pricing.uom}</div>
      </div>
      <div class="stock">
        ${stockStatus(inventory)}
      </div>
      ${pricing.isAvailable ? /* html */`
        <div class="action">
          <input class="quantity" value="1"/>
          <button class='add-to-cart'>ADD TO CART</button>
        </div>
      ` : ''}
      <div class="requirements">
        <div class="minQuantity">
          Min. Qty: ${pricing.numericuom}
        </div>
        <span>|</span>
        <div class="increments">
          Increments of: ${pricing.numericuom}
        </div>
      </div>`;
  }

  /**
   * @returns {Promise<ProductInventory>}
   */
  async fetchInventory() {
    /** @type {ProductInventory} */
    const inventory = {
      isAvailable: false,
      stock: [],
    };
    const res = await lookupProductInventory([this.sku]);
    console.debug('[product] inventory: ', res);
    if (!res.products || res.products.length === 0) {
      return inventory;
    }

    inventory.stock = res.productInventory;
    return inventory;
  }

  /**
   * @returns {Promise<ProductPricing>}
   */
  async fetchPricing() {
    const res = await lookupProductPricing([this.sku]);
    console.debug('[product] pricing: ', res);

    if (!res.products || res.products.length === 0) {
      return {};
    }

    const [pricing] = res.products;

    if (typeof pricing.numericuom === 'string') {
      pricing.numericuom = parseInt(pricing.numericuom, 10);
    }

    if (pricing.qty > 0) {
      pricing.isAvailable = true;
    }

    // TODO: pull currency from source of truth
    if (!pricing.currency) {
      pricing.currency = 'CA';
    }

    return pricing;
  }

  /**
   * Renders the product block
   */
  render() {
    console.debug('[product] render() ', store.product);
    this.renderProductScaffolding();
    if (store.product.description) {
      this.renderProductOverview();
    }

    this.userAccount = getUserAccount();
    if (!this.userAccount) {
      this.renderPricingSignin();
      return;
    }
    this.renderPricingLoading();

    Promise.all([
      this.fetchInventory(),
      this.fetchPricing(),
    ]).then(([inventory, pricing]) => {
      // if pricing declares as in stock and there are no inventory locations
      // mark the product as "call for availability"
      if (pricing.isAvailable && !inventory.isAvailable) {
        inventory.cfa = true;
      }

      store.product.inventory = inventory;
      store.product.pricing = pricing;

      const productCartElement = this.block.querySelector('.product-config .cart');
      productCartElement.innerHTML = this.renderAddToCartBlock(
        inventory,
        pricing,
        pricing.currency,
      );
      this.enableAddToCart();

      const addToCartBtn = this.block.querySelector('.cart .action .add-to-cart');
      addToCartBtn.addEventListener('click', () => {
        this.addToCart();
      });
    });
  }
}

export default async function decorateProduct(block) {
  const productView = new ProductView(block);
  await productView.load();
}
