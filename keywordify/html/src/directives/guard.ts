/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2018 Google LLC (Original Work)
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
} from '../directive.js';
import { noChange, type Part } from '../lit-html.js';

// A sentinel that indicates guard() hasn't rendered anything yet
const initialValue = {};

class GuardDirective<T> extends Directive {
  private [K._previousValue]: unknown = initialValue;

  [K.render](_value: unknown, f: () => T): T {
    return f();
  }

  override [K.update](_part: Part, [value, f]: DirectiveParameters<this>) {
    if (Array.isArray(value)) {
      // Dirty-check arrays by item
      if (
        Array.isArray(this[K._previousValue]) &&
        this[K._previousValue].length === value.length &&
        value.every(
          (v, i) => v === (this[K._previousValue] as Array<unknown>)[i],
        )
      ) {
        return noChange;
      }
    } else if (this[K._previousValue] === value) {
      // Dirty-check non-arrays by identity
      return noChange;
    }

    // Copy the value if it's an array so that if it's mutated we don't forget
    // what the previous values were.
    this[K._previousValue] = Array.isArray(value) ? Array.from(value) : value;
    const r = this[K.render](value, f);
    return r;
  }
}

type Guard = <T>(
  vals: unknown[],
  f: () => T,
) => DirectiveResult<typeof GuardDirective<T>>;

/**
 * Prevents re-render of a template function until a single value or an array of
 * values changes.
 *
 * Values are checked against previous values with strict equality (`===`), and
 * so the check won't detect nested property changes inside objects or arrays.
 * Arrays values have each item checked against the previous value at the same
 * index with strict equality. Nested arrays are also checked only by strict
 * equality.
 *
 * Example:
 *
 * ```js
 * html`
 *   <div>
 *     ${guard([user.id, company.id], () => html`...`)}
 *   </div>
 * `
 * ```
 *
 * In this case, the template only rerenders if either `user.id` or `company.id`
 * changes.
 *
 * guard() is useful with immutable data patterns, by preventing expensive work
 * until data updates.
 *
 * Example:
 *
 * ```js
 * html`
 *   <div>
 *     ${guard([immutableItems], () => immutableItems.map(i => html`${i}`))}
 *   </div>
 * `
 * ```
 *
 * In this case, items are mapped over only when the array reference changes.
 *
 * @param value the value to check before re-rendering
 * @param f the template function
 */
export const guard: Guard = directive(GuardDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { GuardDirective };
