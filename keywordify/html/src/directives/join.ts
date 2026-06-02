/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as RK from '~keywords/raw';

const isFunction = (v: unknown): v is AnyFunction => typeof v === RK.function;

/**
 * Returns an iterable containing the values in `items` interleaved with the
 * `joiner` value.
 *
 * @example
 *
 * ```ts
 * render() {
 *   return html`
 *     ${join(items, html`<span class="separator">|</span>`)}
 *   `;
 * }
 */
export function join<I, J>(
  items: Iterable<I> | undefined,
  joiner: (index: number) => J,
): Iterable<I | J>;
export function join<I, J>(
  items: Iterable<I> | undefined,
  joiner: J,
): Iterable<I | J>;
export function* join<I, J>(items: Iterable<I> | undefined, joiner: J) {
  const isFunc = isFunction(joiner);
  if (items !== undefined) {
    let i = -1;
    for (const value of items) {
      if (i > -1) {
        yield isFunc ? joiner(i) : joiner;
      }
      i++;
      yield value;
    }
  }
}
