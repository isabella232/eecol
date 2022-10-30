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

import type { Cart } from '../scripts/modules/Cart';
import type { Auth } from '../scripts/modules/Auth';
import type { InventoryStore } from '../scripts/modules/Inventory';
import { EventHandler, EventMap, OffEventFn } from './Events';
import type { Product } from './Product';
import { FilterPrivate } from './util';

// export type { Cart } from '../scripts/modules/Cart';
// export type { Auth } from '../scripts/modules/Auth';
// export type { InventoryStore } from '../scripts/modules/Inventory';

interface ModuleMap {
  Auth: Auth;
  Inventory: InventoryStore;
  Cart: Cart;
}

export type LazyModuleType = keyof ModuleMap;

export type LazyModule<TName extends LazyModuleType> =
  (store: Store) => Promise<ModuleMap[TName]>;

export type LazyModuleState = [
  // function that resolves the promise
  ready: ((mod: ModuleMap[LazyModuleType]) => void) | undefined,
  // promise that resolves when module is done loading
  promise: Promise<ModuleMap[LazyModuleType]>,
  // whether the module is actively loading, but not yet ready
  loading: boolean
];

declare class StoreImpl {
  /** Promises of modules being loaded and resolve functions */
  _p: Record<string, LazyModuleState>;

  /** Event handlers by event type */
  _h: { [key in keyof EventMap]: EventHandler<key>[] };

  hrefRoot: string;
  region: string;
  lang: string;
  pageType: 'product' | 'category' | undefined;

  /** if Auth session existed previously */
  hadSess: boolean;

  /** Simple dependency graph for modules */
  graph: Record<LazyModuleType, LazyModuleType[]>;

  /** Modules to load automatically in delayed */
  autoLoad: LazyModuleType[];

  /** Selected product */
  product?: Product;

  /** Upstream API URL */
  upstreamURL: string;

  /** Whether we're running in dev mode */
  dev: boolean;

  /** listen for an event */
  on: <T extends keyof EventMap>(ev: T, handler: EventHandler<T>) => OffEventFn;

  /** emit an event */
  emit: <T extends keyof EventMap>(ev: T, data: EventMap[T]) => void;

  /** Set module to loading state */
  setLoading: (name: LazyModuleType) => void;

  /** Whether an active authentication redirect flow is occurring */
  isLoginInProgress: () => boolean;

  /** Load a module if needed */
  load<TName extends LazyModuleType>(name: TName): Promise<ModuleMap[TName]>;

  /** Check if a module is ready synchronously */
  isReady: (name: LazyModuleType) => boolean;

  /** Check if a module is loading synchronously */
  isLoading: (name: LazyModuleType) => boolean;

  /** Promise that resolves when the module is ready */
  whenReady: (name: LazyModuleType) => Promise<void>;

  /** Register module at name */
  registerModule<TName extends LazyModuleType>(
    name: TName,
    module: ModuleMap[TName]
  ): void;

  /** Declare module as ready */
  moduleReady: (name: LazyModuleType) => void;
}

/**
 * The exposed store API
 */
export type Store = FilterPrivate<StoreImpl> & ModuleMap;