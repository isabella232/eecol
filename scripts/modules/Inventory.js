export class InventoryStore {
  constructor(store) {
    this.store = store;
    /** @type {Map<string, InventoryDetails>} */
    this._data = new Map();
  }

  /**
   * @param {string[]} skus
   * @returns {Promise<Record<string, InventoryDetails>>}
   */
  async getDetails(skus) {
    /** @type {Record<string, InventoryDetails>} */
    const data = {};

    const skusToFetch = [];
    skus.forEach((sku) => {
      const existing = this._data.get(sku);
      if (!existing) {
        skusToFetch.push(sku);
      } else {
        data[sku] = existing;
      }
    });
    const fetched = await this.fetchDetails(skus);

    return {
      ...fetched,
      ...data,
    };
  }

  /**
   * @param {string[]} skus
   * @returns {Promise<Record<string, InventoryDetails>>}
   */
  async fetchDetails(skus) {
    // eslint-disable-next-line no-param-reassign
    skus = skus.map((sku) => sku.toUpperCase());
    const [stock, pricing] = await Promise.all([
      this.fetchStock(skus),
      this.fetchPricing(skus),
    ]);

    /** @type {Record<string, InventoryDetails>} */
    const data = {};
    skus.forEach((sku) => {
      const item = {
        pricing: pricing[sku],
        stock: stock[sku],
      };

      // if pricing declares as in stock and there are no inventory locations
      // mark the product as "call for availability"
      if (item.pricing.isAvailable && !item.stock.isAvailable) {
        item.stock.cfa = true;
      }

      data[sku] = item;
      this._data.set(sku, item);
    });

    return data;
  }

  /**
   * @param {string[]} skus
   * @returns {Promise<Record<string, ProductStock>>}
   */
  async fetchStock(skus) {
    const empty = () => ({});

    const res = await this._fetchStock(skus);
    if (!res.productInventory || res.productInventory.length === 0) {
      return Object.fromEntries(skus.map((sku) => [sku, empty()]));
    }

    const stockData = {};
    const skusLeft = Object.fromEntries(skus.map((sku) => [sku, 0]));
    res.productInventory.forEach((product) => {
      stockData[product.sku] = product;
      delete skusLeft[product.sku];
    });

    Object.keys(skusLeft).forEach((sku) => {
      stockData[sku] = empty();
    });
    return stockData;
  }

  /**
   * @param {string[]} skus
   * @returns {Promise<Record<string, ProductPricing>>}
   */
  async fetchPricing(skus) {
    const empty = () => ({});

    const res = await this._fetchPricing(skus);
    console.debug('[Inventory] pricing: ', res);

    if (!res.products || res.products.length === 0) {
      return Object.fromEntries(skus.map((sku) => [sku, empty()]));
    }

    const pricingData = {};
    const skusLeft = Object.fromEntries(skus.map((sku) => [sku, 0]));
    res.products.forEach((pricing) => {
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

      delete skusLeft[pricing.sku];
      pricingData[pricing.sku] = pricing;
    });

    Object.keys(skusLeft).forEach((sku) => {
      pricingData[sku] = empty();
    });

    return pricingData;
  }

  /**
   * Fetches the stock for a product
   * @param {string[]} skus
   * @returns {Promise<ProductStockResponse>}
   */
  async _fetchStock(skus) {
    if (!skus || skus.length === 0) {
      return {};
    }

    const { Auth, upstreamURL } = this.store;
    const valid = await Auth.validate();
    if (!valid) {
      return {};
    }

    const skusStr = encodeURIComponent(skus.join(','));
    const req = await fetch(`${upstreamURL}/stock?sku=${skusStr}`);
    const json = await req.json();
    return json.data;
  }

  /**
   * Fetches the pricing for a product
   * @param {string[]} skus
   * @returns {Promise<ProductPricingResponse>}
   */
  async _fetchPricing(skus) {
    if (!skus || skus.length === 0) {
      return {};
    }

    const { Auth, upstreamURL } = this.store;
    const valid = await Auth.validate();
    if (!valid) {
      return {};
    }

    const skusStr = encodeURIComponent(skus.join(','));
    const req = await fetch(`${upstreamURL}/pricing?sku=${skusStr}`);
    const json = await req.json();
    return json.data;
  }
}

/**
 * @type {LazyModule<'Inventory'>}
 */
export default function load(store) {
  return new InventoryStore(store);
}
