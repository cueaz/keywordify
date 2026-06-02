/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2020 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import {
  Directive,
  type DirectiveParameters,
  type DirectiveResult,
  directive,
  type PartInfo,
  PartType,
} from '../directive.js';
import { isSingleExpression, setCommittedValue } from '../directive-helpers.js';
import { type AttributePart, noChange, nothing } from '../lit-html.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

class LiveDirective<T> extends Directive {
  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      !(
        partInfo[K.type] === PartType[K.PROPERTY] ||
        partInfo[K.type] === PartType[K.ATTRIBUTE] ||
        partInfo[K.type] === PartType[K.BOOLEAN_ATTRIBUTE]
      )
    ) {
      if (DEV_MODE) {
        throw new Error(
          'The `live` directive is not allowed on child or event bindings',
        );
      } else {
        throw new Error();
      }
    }
    if (!isSingleExpression(partInfo)) {
      if (DEV_MODE) {
        throw new Error('`live` bindings can only contain a single expression');
      } else {
        throw new Error();
      }
    }
  }

  [K.render](value: T): T {
    return value;
  }

  override [K.update](part: AttributePart, [value]: DirectiveParameters<this>) {
    if (value === noChange || value === nothing) {
      return value;
    }
    const element = part[K.element];
    const name = part[K.name];

    if (part[K.type] === PartType[K.PROPERTY]) {
      if (value === (element as unknown as Record<string, unknown>)[name]) {
        return noChange;
      }
    } else if (part[K.type] === PartType[K.BOOLEAN_ATTRIBUTE]) {
      if (!!value === element.hasAttribute(name)) {
        return noChange;
      }
    } else if (part[K.type] === PartType[K.ATTRIBUTE]) {
      if (element.getAttribute(name) === String(value)) {
        return noChange;
      }
    }
    // Resets the part's value, causing its dirty-check to fail so that it
    // always sets the value.
    setCommittedValue(part);
    return value;
  }
}

type Live = <T>(value: T) => DirectiveResult<typeof LiveDirective<T>>;

/**
 * Checks binding values against live DOM values, instead of previously bound
 * values, when determining whether to update the value.
 *
 * This is useful for cases where the DOM value may change from outside of
 * lit-html, such as with a binding to an `<input>` element's `value` property,
 * a content editable elements text, or to a custom element that changes it's
 * own properties or attributes.
 *
 * In these cases if the DOM value changes, but the value set through lit-html
 * bindings hasn't, lit-html won't know to update the DOM value and will leave
 * it alone. If this is not what you want--if you want to overwrite the DOM
 * value with the bound value no matter what--use the `live()` directive:
 *
 * ```js
 * html`<input .value=${live(x)}>`
 * ```
 *
 * `live()` performs a strict equality check against the live DOM value, and if
 * the new value is equal to the live value, does nothing. This means that
 * `live()` should not be used when the binding will cause a type conversion. If
 * you use `live()` with an attribute binding, make sure that only strings are
 * passed in, or the binding will update every render.
 */
export const live: Live = directive(LiveDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { LiveDirective };
