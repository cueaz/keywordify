/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';

// Note, this module is not included in package exports so that it's private to
// our first-party directives. If it ends up being useful, we can open it up and
// export it.

/**
 * Helper to iterate an AsyncIterable in its own closure.
 * @param iterable The iterable to iterate
 * @param callback The callback to call for each value. If the callback returns
 * `false`, the loop will be broken.
 */
export const forAwaitOf = async <T>(
  iterable: AsyncIterable<T>,
  callback: (value: T) => Promise<boolean>,
) => {
  for await (const v of iterable) {
    if ((await callback(v)) === false) {
      return;
    }
  }
};

/**
 * Holds a reference to an instance that can be disconnected and reconnected,
 * so that a closure over the ref (e.g. in a then function to a promise) does
 * not strongly hold a ref to the instance. Approximates a WeakRef but must
 * be manually connected & disconnected to the backing instance.
 */
export class PseudoWeakRef<T> {
  private [K._ref]?: T | undefined;
  constructor(ref: T) {
    this[K._ref] = ref;
  }
  /**
   * Disassociates the ref with the backing instance.
   */
  [K.disconnect]() {
    this[K._ref] = undefined;
  }
  /**
   * Reassociates the ref with the backing instance.
   */
  [K.reconnect](ref: T) {
    this[K._ref] = ref;
  }
  /**
   * Retrieves the backing instance (will be undefined when disconnected)
   */
  [K.deref]() {
    return this[K._ref];
  }
}

/**
 * A helper to pause and resume waiting on a condition in an async function
 */
export class Pauser {
  private [K._promise]?: Promise<void> | undefined = undefined;
  private [K._resolve]?: (() => void) | undefined = undefined;
  /**
   * When paused, returns a promise to be awaited; when unpaused, returns
   * undefined. Note that in the microtask between the pauser being resumed
   * an await of this promise resolving, the pauser could be paused again,
   * hence callers should check the promise in a loop when awaiting.
   * @returns A promise to be awaited when paused or undefined
   */
  [K.get]() {
    return this[K._promise];
  }
  /**
   * Creates a promise to be awaited
   */
  [K.pause]() {
    this[K._promise] ??= new Promise((resolve) => (this[K._resolve] = resolve));
  }
  /**
   * Resolves the promise which may be awaited
   */
  [K.resume]() {
    this[K._resolve]?.();
    this[K._promise] = this[K._resolve] = undefined;
  }
}
