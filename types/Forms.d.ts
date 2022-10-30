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

type HTMLInputTypeAttribute = 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week';

type FormFieldInputType = HTMLInputTypeAttribute | 'heading';

export interface FormElementAPI {
  setLoading: (loading: boolean) => void;
}

export type AugmentedFormElement = HTMLFormElement & FormElementAPI;

export type FormForwardedEvent<TPayload> = {
  data: TPayload;
  target: AugmentedFormElement;
}

/**
 * The expected format of a form row in the definition spreadsheet
 */
export interface FormFieldDefinition {
  /**
   * The field ID
   * Becomes the input's key in the submission payload.
   * Required for fields with associated data input.
   * Not required for non-data fields like `submit` or `heading`.
   */
  Field?: string;
  /**
   * Human-readable label
   * If the value (converted to camelCase) matches one of 
   * the `placeholders` keys,  it will be replaced.
   */
  Label: string;
  /**
   * Input type
   * Any valid HTML input type, or `heading`
   */
  Type: FormFieldInputType;
  /**
   * Value to set for the input's `autocomplete` attribute
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
   */
  Autocomplete?: string;

  /** Variant for buttons */
  Variant?: string;

  /** Event emitted on field actions */
  Event?: string;
}

/**
 * The config object from the block table
 */
export interface FormConfig {
  /** Definition URL (spreadsheet with helix-default sheet) */
  definition: string;
  /** 
   * Event to emit on submit 
   * Replaces `-` in doc with `:` in code
   * ie. `auth-signin-submit` becomes `auth:signin:submit`
   */
  event?: string;
  /**
   * Additional template class to use for the form element
   * This is prepended with `template-` and maps to styles
   * defined in `/blocks/forms/forms.css`
   */
  template?: string;
}

/**
 * The sanitized options provided to helix-forms helper
 */
export interface CreateFormOptions {
  /**
   * Override submission URL
   * If not provided, will post submissions to the workbook's `incoming` sheet (formURL without the .json suffix)
   */
  submissionURL?: string;
  /**
   * Whether the formURL should be treated as external
   */
  absoluteDefinitionURL?: boolean;
  /**
   * Autocomplete attribute for the entire form element
   */
  autocomplete?: string;
  /**
   * Placeholders to replace labels and placeholder text with
   * Keys are expected to be camelCase
   */
  placeholders?: Record<string, string>;

  /**
   * Action to take on submit
   * 
   * Callback function or event to emit (via form element's `dispatchEvent()`)
   * 
   * If callback is specified, the submission logic is skipped
   * and the callback should handle the payload submission.
   * This does not skip payload validation.
   */
  action?: string | (() => unknown | Promise<unknown>);
}

declare module '../scripts/helix-forms.esm.js' {
  export function createForm(formURL: string, options?: CreateFormOptions): Promise<HTMLFormElement>;
}