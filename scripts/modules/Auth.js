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

import { dupe, SESSION_KEY } from '../scripts.js';

const w = window;
const log = logger('Auth');

export class Auth {
  constructor(store) {
    /** @type {Store} */
    this.store = store;
    /** @type {Session|undefined} */
    this.session = undefined;

    this.redirect = this._extractRedirect();
    this.attachListeners();
  }

  _extractRedirect() {
    const { pathname, hash } = w.location.pathname;
    let redirect = this.store.hrefRoot;
    if (this.onSigninPage() && hash) {
      const hps = new URLSearchParams(hash.substring(1));
      const r = hps.get('redirect');
      if (r) {
        redirect = decodeURIComponent(r);
        w.history.replaceState('', document.title, pathname);
      }
    }
    return redirect;
  }

  onSigninPage() {
    const { pathname } = w.location.pathname;
    return pathname === `${this.redirect}/signin`;
  }

  attachListeners() {
    // eslint-disable-next-line no-alert
    this.store.on('auth:signin:submit', () => alert('not implemented!'));
    this.store.on('auth:signin:submit:beta', async ({ target, data }) => {
      const { email, password } = data;
      target.setLoading(true);
      await this.signin(email, password);
      w.location.href = this.redirect;
    });
  }

  isValid() {
    return this.session && (Date.now() / 1000) < this.session.expiresAt;
  }

  async load() {
    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) {
      return;
    }

    try {
      this.session = JSON.parse(data);
      if (!this.isValid()) {
        this.session = undefined;
        throw Error('expired');
      }
    } catch {
      this.save();
    }
  }

  get customer() {
    if (!this.session) return undefined;
    return this.session.customer;
  }

  get company() {
    if (!this.session) return undefined;
    return this.session.company;
  }

  save() {
    if (this.session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
    this.store.emit('auth:changed', dupe(this.session));
  }

  invalidate() {
    if (!this.session) return;
    this.session = undefined;
    this.save();
  }

  async signin(email, password) {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!res.ok) {
      throw Error(`failed to login (${res.status})`);
    }

    const data = await res.json();

    const {
      expiresIn,
      token,
      mulesoftToken,
      company,
      customer,
    } = data;

    if (!token || !mulesoftToken || !expiresIn) {
      throw Error('failed to login, invalid data');
    }

    this.session = {
      expiresAt: (Date.now() / 1000) + expiresIn,
      token,
      mulesoftToken,
      company,
      customer,
    };
    this.save();
  }

  async signout() {
    this.session = undefined;
    this.save();
    const res = await fetch('/api/auth/signout', { method: 'POST' });
    if (!res.ok) {
      log.warn('failed to log out: ', res);
    }
  }
}

/**
 * @type {LazyModule<'Auth'>}
 */
export default async function load(store) {
  const auth = new Auth(store);
  await auth.load();
  return auth;
}
