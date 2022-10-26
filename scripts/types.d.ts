import { PublicClientApplication, EventType } from '@azure/msal-browser';
import * as MSAL from '@azure/msal-browser';

import type { Cart as CartModule } from '../blocks/cart/cart';
import type { InventoryStore as InventoryModule } from './modules/Inventory';
import type {
  ProductData as ProductDataType,
  ProductPage as ProductPageType,
  PageInfo as PageInfoType
} from '../blocks/product/Product';
import type {
  ProductView as ProductViewType
} from '../blocks/product/ProductView';

type Common<A, B> = {
  [P in keyof A & keyof B]: A[P] | B[P];
}

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

  export type ProductData = ProductDataType;
  export type ProductPage = ProductPageType;
  export type ProductView = ProductViewType;
  export type ProductBase = Common<ProductData, ProductView> & { image: string };

  export interface SearchResult {
    page_info: PageInfoType;
    items: { productView: ProductView }[];
  }

  export interface SearchSuggestionResult {
    page_info: PageInfoType;
    items: { productView: Pick<ProductView, 'sku' | 'name' | 'shortDescription'> }[];
  }

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

  export interface BranchStock {
    branchCode: string;
    qty: number;
    qtyInTransit: number;
    qtyCommited: number;
  }

  export interface ProductStock {
    isAvailable: boolean;
    /** call for availability */
    cfa?: boolean;
    stock: BranchStock[];
  }

  /**
   * Mulesoft Stock Response Object
   */
  export interface ProductStockResponse {
    branchLocations: BranchLocation[];
    productInventory: ProductStock[];
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
    /** The sellprice for the given uom */
    totalSellPrice: number;
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

  export interface InventoryDetails {
    pricing: ProductPricing;
    stock: ProductStock;
  }

  /**
   * Product Object
   */
  export interface Product extends InventoryDetails {
    /** An array of category ids */
    categories: string[];
    /** The product description */
    description: string;
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
    manufacturer_code: string;
    manufacturer: string;
    manufacturer_part_number: string;
    manufacturer_part_number_brand: string;
  }

  export type Cart = CartModule;

  export interface AuthModule {
    validate: () => Promise<boolean>;
  }

  export type LazyModuleType = 'Auth' | 'Inventory';

  interface ModuleMap {
    Auth: AuthModule;
    Inventory: InventoryModule;
  }

  export type LazyModule<TName extends LazyModuleType> =
    (store: Store) => Promise<ModuleMap[TName]>;

  export type AutoLoadModule = LazyModuleType
    | string
    | [name: LazyModuleType | string, dependencies: (LazyModuleType | string)[]];

  export type LazyModuleState = [
    // function that resolves the promise
    ready: (() => void) | undefined,
    // promise that resolves when module is done loading
    promise: Promise<void>,
    // whether the module is actively loading, but not yet ready
    loading: boolean
  ];

  interface StoreInternal {
    /** Promises of modules being loaded and resolve functions */
    _p: Record<string, LazyModuleState>;

    /** Modules to load automatically in delayed */
    autoLoad: AutoLoadModule[];

    /** Selected product */
    product?: Product;

    /** Cart block module-like */
    cart?: CartModule;

    /** Upstream API URL */
    upstreamURL: string;

    /** Whether we're running in dev mode */
    dev: boolean;

    /** Set module to loading state */
    setLoading: (name: LazyModuleType) => void;

    /** Whether an active authentication redirect flow is occurring */
    isLoginInProgress: () => boolean;

    /** Load a module if needed */
    load: (name: LazyModuleType) => Promise<void>;

    /** Check if a module is ready synchronously */
    isReady: (name: LazyModuleType) => boolean;

    /** Promise that resolves when the module is ready */
    whenReady: (name: LazyModuleType) => Promise<void>;

    /** Register module at name */
    registerModule<TName extends keyof ModuleMap>(
      name: TName,
      module: ModuleMap[TName]
    ): void;

    /** Declare module as ready */
    moduleReady: (name: LazyModuleType) => void;

  }
  export type Store = Omit<StoreInternal, '_p'> & ModuleMap;
}

export { };