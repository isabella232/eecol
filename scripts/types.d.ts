import { PublicClientApplication, EventType } from '@azure/msal-browser';
import * as MSAL from '@azure/msal-browser';

import type { Cart as CartType } from '../blocks/cart/cart';

declare global {
  interface MSALStatic {
    PublicClientApplication: typeof PublicClientApplication;
    EventType: typeof EventType;
  }

  export interface Window {
    // globals added by auth.js
    msal: MSALStatic;
    validateAuth: () => Promise<void>;
  }
  export var msal: MSALStatic;

  export type RedirectRequest = MSAL.RedirectRequest;

  export interface APIAuthResult {
    access_token: string;
  }

  export interface AuthState {
    /** active directory token */
    adToken?: string;
    /** mulesoft token */
    msToken?: string;
  }


  /**
   * Mulesoft Pricing Response Object
   */
  export interface ProductPricingResponse {
    /** The product id, manufacturer_part_number_brand in CIF? */
    brand: string;
    /** Manufacturer code from EECOL */
    currency: string;
    /** Customer ID */
    customerId: string;
    products: ProductPricing[];
  }

  export interface BranchLocation {
    name: string;
    address1: string;
    address2: string;
    address3: string;
    code: string;
    state: string;
    city: string;
    country: string;
    zipCode: string;
  }

  export interface BranchInventory {
    branchCode: string;
    qty: number;
    qtyInTransit: number;
    qtyCommited: number;
  }

  export interface ProductInventory {
    isAvailable: boolean;
    /** call for availability */
    cfa?: boolean;
    stock: BranchInventory[];
  }

  /**
   * Mulesoft Inventory Response Object
   * TODO
   */
  export interface ProductInventoryResponse {
    branchLocations: BranchLocation[];
    productInventory: ProductInventory[];
  }

  /**
   * Pagination tracking
   */
  export interface Pagination {
    /** Total number of results */
    totalCount: number;
    /** The active page */
    currentPage: number;
    /** The number of items per page */
    pageSize: number;
    /** The total number of pages */
    totalPages: number;
    /** The first page */
    startPage: number;
    /** The last page */
    endPage: number;
    /** The index of the first item */
    startIndex: number;
    /** The index of the last item */
    endIndex: number;
    /** An array of page numbers */
    pages: number[];
  }


  /**
   * Page Info Returned from the API
   */
  export interface PageInfo {
    /** Total number of results */
    currentPage: number;
    /** The active page */
    pageSize: number;
    /** The number of items per page */
    totalPage: number;
  }

  /**
   * Category Object
   */
  export interface Category {
    /** The number of children in the category */
    children_count: number;
    /** The hierarchy level of the category */
    level: number;
    /** The name of the category */
    name: string;
    /** The path of the category (in category ids) */
    path: string;
    /** The unique id of the category */
    uid: string;
    /** The url key of the category */
    url_key: string;
    /** The url path of the category */
    url_path: string;
  }

  /**
   * Mulesoft Pricing Object
   */
  export interface ProductPricing {
    /** The product id, manufacturer_part_number_brand in CIF? */
    productId: string;
    /** Manufacturer code from EECOL */
    productLine: string;
    /** Available quantity */
    qty: number;
    /** The sellprice for the given uom */
    unitSellPrice: number;
    /** Unit of measure, numeric value representing the pricing unit. */
    uom: string;
    /** Alphanumeric branch code */
    branch: string;
    /** Discounts? */
    blank: string;
    /** Alphanumeric field representing the selling unit of measure. */
    sellunit: string;
    /** Numeric value representing the selling unit of measure. */
    numericuom: number;
    /** The stock status of the product */
    basismeasurecode: string;
    /** Customer friendly description of basismeasurecode */
    description: string;
    /** Is the product instock */
    isAvailable: boolean;
  }

  /**
   * Product Object
   */
  export interface Product {
    /** An array of category ids */
    categories: string[];
    /** The product description */
    description: string;
    /** The discount off the product */
    discount_off: number;
    /** The final price of the product */
    final_price: number;
    /** The image url of the product */
    image: string;
    /** The name of the product */
    name: string;
    /** The path of the product */
    path: string;
    /** The regular price of the product */
    regular_price: number;
    /** The sku of the product */
    sku: string;
    /** The stock status of the product */
    stock_status: string;
    pricing: ProductPricing;
    inventory: ProductInventory;
  }

  export type Cart = CartType;

  export interface AuthModule {
    validate: () => Promise<boolean>;
  }

  export type LazyModule = 'cart' | 'auth';

  interface ModuleMap {
    cart: Cart;
    auth: AuthModule;
    [key: LazyModule]: any;
  }

  interface StoreInternal {
    _proms: Record<LazyModule, [
      ready?: () => void,
      promise: Promise<void>
    ]>;
    isLoginInProgress: () => boolean;
    whenReady: (name: LazyModule) => Promise<void>;
    attachModule<KName extends keyof ModuleMap>(
      name: KName,
      module: ModuleMap[KName]
    ): void;
    moduleReady: (name: LazyModule) => void;
    product?: Product;
    cart?: Cart;
    auth: AuthModule;
  }
  export type Store = Omit<StoreInternal, '_proms'>;
}

export { };