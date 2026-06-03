/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import { Directive, directive, type PartInfo, PartType } from '../directive.js';
import { noChange, nothing, type TemplateResult } from '../lit-html.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

const HTML_RESULT = 1;

export class UnsafeHTMLDirective extends Directive {
  static [K.directiveName]: string = K.unsafeHTML;
  static [K.resultType] = HTML_RESULT;

  private [K._value]: unknown = nothing;
  private [K._templateResult]?: TemplateResult | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo[K.type] !== PartType[K.CHILD]) {
      if (DEV_MODE) {
        throw new Error(
          `${
            (this.constructor as typeof UnsafeHTMLDirective)[K.directiveName]
          }() can only be used in child bindings`,
        );
      } else {
        throw new Error();
      }
    }
  }

  [K.render](
    value: string | typeof nothing | typeof noChange | undefined | null,
  ) {
    if (value === nothing || value == null) {
      this[K._templateResult] = undefined;
      this[K._value] = value;
      return value;
    }
    if (value === noChange) {
      return value;
    }
    if (typeof value !== 'string') {
      if (DEV_MODE) {
        throw new Error(
          `${
            (this.constructor as typeof UnsafeHTMLDirective)[K.directiveName]
          }() called with a non-string value`,
        );
      } else {
        throw new Error();
      }
    }
    if (value === this[K._value]) {
      return this[K._templateResult];
    }
    this[K._value] = value;
    const strings = [value] as unknown as TemplateStringsArray;
    (strings as unknown as { raw: TemplateStringsArray }).raw = strings;
    // WARNING: impersonating a TemplateResult like this is extremely
    // dangerous. Third-party directives should not do this.
    this[K._templateResult] = {
      // Cast to a known set of integers that satisfy ResultType so that we
      // don't have to export ResultType and possibly encourage this pattern.
      // This property needs to remain unminified.
      [K._$litType$]: (this.constructor as typeof UnsafeHTMLDirective)[
        K.resultType
      ] as 1 | 2,
      [K.strings]: strings,
      [K.values]: [],
    };
    return this[K._templateResult];
  }
}

/**
 * Renders the result as HTML, rather than text.
 *
 * The values `undefined`, `null`, and `nothing`, will all result in no content
 * (empty string) being rendered.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
export const unsafeHTML = directive(UnsafeHTMLDirective);
