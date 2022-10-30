/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import type { ProductView } from './ProductView';
import type { Common } from './util';

export type ProductBase = Common<ProductData, ProductView> & { image: string };

export interface ProductPage {
  data: ProductData[];
  totalCount: number;
  facets: ProductFacet[];
  pageInfo: PageInfo;
}

export interface PageInfo {
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductData {
  sku: string;
  name: string;
  manufacturer: string;
  description: string;
  image: string;
  categories: string[];
  manufacturer_code: string;
  manufacturer_part_number_brand: string;
  manufacturer_part_number: string;
  path: string;
}

export interface ProductFacetOption {
  label: string;
  count: number;
  value: string;
}

export interface ProductFacet {
  attribute_code: string;
  label: string;
  options: ProductFacetOption[];
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