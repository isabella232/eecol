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

import type { Session, SigninPayload } from './Auth';
import type { FormForwardedEvent } from './Forms';

export interface EventMap {
  /** when Auth changes from logged in/out to opposite */
  'auth:changed': Session;

  /** when submit button is clicked on signin form */
  'auth:signin:submit': FormForwardedEvent<SigninPayload>;
  'auth:signin:submit:beta': FormForwardedEvent<SigninPayload>;

  /** toggle the profile modal, redirect to login, or redirect to profile */
  'account:modal:toggle': undefined | boolean;

  /** when cart selection has been updated */
  'cart:changed': undefined;

  /** toggle the cart modal or redirect to cart details */
  'cart:modal:toggle': undefined | boolean;
}

export type EventHandler<T extends keyof EventMap> = (data: EventMap[T]) => unknown | Promise<unknown>

export type OffEventFn = () => void;

export type OnEventFn<T extends keyof EventMap> = (ev: T, handler: EventHandler<T>) => OffEventFn;

export type EmitEventFn<T extends keyof EventMap> = (ev: T, data: EventMap[T]) => void;