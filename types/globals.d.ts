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

import type * as StoreT from './Store';
import type * as SessionT from './Session';
import type * as ProductT from './Product';
import type * as LoggerT from './Logger';


/**
 * Export types in global namespace for convenience in JS
 */


declare global {
  export type Store = StoreT.Store;
  export type LazyModuleType = StoreT.LazyModuleType;
  export type LazyModule<TName extends LazyModuleType> = StoreT.LazyModule<TName>;

  export type ProductStock = ProductT.ProductStock;
  export type ProductPricing = ProductT.ProductPricing;
  export type Session = SessionT.Session;

  export type Logger = LoggerT.Logger;
  export type LoggerFactory = LoggerT.LoggerFactory;
  export type LoggerColors = LoggerT.LoggerColors;

  export interface Window {
    store: Store;
    logger: LoggerFactory;
  }
  var logger: LoggerFactory;
}

export { };