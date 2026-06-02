/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import {
  type DirectiveParameters,
  directive,
  type PartInfo,
  PartType,
} from '../directive.js';
import {
  clearPart,
  insertPart,
  setChildPartValue,
} from '../directive-helpers.js';
import type { ChildPart } from '../lit-html.js';
import { AsyncReplaceDirective } from './async-replace.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

class AsyncAppendDirective extends AsyncReplaceDirective {
  private [K.__childPart]!: ChildPart;

  // Override AsyncReplace to narrow the allowed part type to ChildPart only
  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo[K.type] !== PartType[K.CHILD]) {
      if (DEV_MODE) {
        throw new Error('asyncAppend can only be used in child expressions');
      } else {
        throw new Error();
      }
    }
  }

  // Override AsyncReplace to save the part since we need to append into it
  override [K.update](part: ChildPart, params: DirectiveParameters<this>) {
    this[K.__childPart] = part;
    return super[K.update](part, params);
  }

  // Override AsyncReplace to append rather than replace
  protected override [K.commitValue](value: unknown, index: number) {
    // When we get the first value, clear the part. This lets the
    // previous value display until we can replace it.
    if (index === 0) {
      clearPart(this[K.__childPart]);
    }
    // Create and insert a new part and set its value to the next value
    const newPart = insertPart(this[K.__childPart]);
    setChildPartValue(newPart, value);
  }
}

/**
 * A directive that renders the items of an async iterable[1], appending new
 * values after previous values, similar to the built-in support for iterables.
 * This directive is usable only in child expressions.
 *
 * Async iterables are objects with a [Symbol.asyncIterator] method, which
 * returns an iterator who's `next()` method returns a Promise. When a new
 * value is available, the Promise resolves and the value is appended to the
 * Part controlled by the directive. If another value other than this
 * directive has been set on the Part, the iterable will no longer be listened
 * to and new values won't be written to the Part.
 *
 * [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
 *
 * @param value An async iterable
 * @param mapper An optional function that maps from (value, index) to another
 *     value. Useful for generating templates for each item in the iterable.
 */
export const asyncAppend = directive(AsyncAppendDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { AsyncAppendDirective };
