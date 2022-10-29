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

export interface SigninPayload {
  email: string;
  password: string;
}

export interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export interface CompanyProfile {
  /** @example "BDW" */
  accountNumber: string;
  /** @example "EECOL" */
  brand: string;
  /** @example "Test Company 2-2 (Darryl Miller)" */
  name: string;
  /** @example "Test Company 2-2" */
  legalName: string;
  /** @example "01" */
  salesRegion: string;
  /** @example "01" */
  defaultBranch: string;
}

export interface Session {
  expiresAt: number;
  token: string;
  mulesoftToken: string;
  customer: CustomerProfile;
  company: CompanyProfile;
}