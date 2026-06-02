/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2020 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import * as RK from '~keywords/raw';
import { AsyncDirective, directive } from '../async-directive.js';
import { type ElementPart, nothing } from '../lit-html.js';

const isFunction = (v: unknown): v is AnyFunction => typeof v === RK.function;

const global = globalThis;

/**
 * Creates a new Ref object, which is container for a reference to an element.
 */
export const createRef = <T = Element>() => new Ref<T>();

/**
 * An object that holds a ref value.
 */
class Ref<T = Element> {
  /**
   * The current Element value of the ref, or else `undefined` if the ref is no
   * longer rendered.
   */
  readonly [K.value]?: T;
}

export type { Ref };

interface RefInternal {
  [K.value]: Element | undefined;
}

// When callbacks are used for refs, this map tracks the last value the callback
// was called with, for ensuring a directive doesn't clear the ref if the ref
// has already been rendered to a new spot. It is double-keyed on both the
// context (`options.host`) and the callback, since we auto-bind class methods
// to `options.host`.
const lastElementForContextAndCallback = new WeakMap<
  object,
  WeakMap<AnyFunction, Element | undefined>
>();

export type RefOrCallback<T = Element> = Ref<T> | ((el: T | undefined) => void);

class RefDirective extends AsyncDirective {
  private [K._element]?: Element | undefined;
  private [K._ref]?: RefOrCallback | undefined;
  private [K._context]?: object | undefined;

  [K.render](_ref?: RefOrCallback) {
    return nothing;
  }

  override [K.update](
    part: ElementPart,
    [ref]: Parameters<this[typeof K.render]>,
  ) {
    const refChanged = ref !== this[K._ref];
    if (refChanged) {
      // The ref passed to the directive has changed;
      // unset the previous ref's value
      this[K._updateRefValue](undefined);
    }
    if (refChanged || this[K._lastElementForRef] !== this[K._element]) {
      // We either got a new ref or this is the first render;
      // store the ref/element & update the ref value
      this[K._ref] = ref;
      this[K._context] = part[K.options]?.[K.host];
      this[K._element] = part[K.element];
      this[K._updateRefValue](this[K._element]);
    }
    return nothing;
  }

  private [K._updateRefValue](element: Element | undefined) {
    if (this[K._ref] === undefined) {
      return;
    }
    if (!this[K.isConnected]) {
      element = undefined;
    }
    if (isFunction(this[K._ref])) {
      // If the current ref was called with a previous value, call with
      // `undefined`; We do this to ensure callbacks are called in a consistent
      // way regardless of whether a ref might be moving up in the tree (in
      // which case it would otherwise be called with the new value before the
      // previous one unsets it) and down in the tree (where it would be unset
      // before being set). Note that element lookup is keyed by
      // both the context and the callback, since we allow passing unbound
      // functions that are called on options.host, and we want to treat
      // these as unique "instances" of a function.
      const context = this[K._context] ?? global;
      let lastElementForCallback =
        lastElementForContextAndCallback.get(context);
      if (lastElementForCallback === undefined) {
        lastElementForCallback = new WeakMap();
        lastElementForContextAndCallback.set(context, lastElementForCallback);
      }
      if (lastElementForCallback.get(this[K._ref]) !== undefined) {
        this[K._ref].call(this[K._context], undefined);
      }
      lastElementForCallback.set(this[K._ref], element);
      // Call the ref with the new element value
      if (element !== undefined) {
        this[K._ref].call(this[K._context], element);
      }
    } else {
      (this[K._ref] as RefInternal)![K.value] = element;
    }
  }

  private get [K._lastElementForRef]() {
    return isFunction(this[K._ref])
      ? lastElementForContextAndCallback
          .get(this[K._context] ?? global)
          ?.get(this[K._ref])
      : this[K._ref]?.[K.value];
  }

  override [K.disconnected]() {
    // Only clear the box if our element is still the one in it (i.e. another
    // directive instance hasn't rendered its element to it before us); that
    // only happens in the event of the directive being cleared (not via manual
    // disconnection)
    if (this[K._lastElementForRef] === this[K._element]) {
      this[K._updateRefValue](undefined);
    }
  }

  override [K.reconnected]() {
    // If we were manually disconnected, we can safely put our element back in
    // the box, since no rendering could have occurred to change its state
    this[K._updateRefValue](this[K._element]);
  }
}

/**
 * Sets the value of a Ref object or calls a ref callback with the element it's
 * bound to.
 *
 * A Ref object acts as a container for a reference to an element. A ref
 * callback is a function that takes an element as its only argument.
 *
 * The ref directive sets the value of the Ref object or calls the ref callback
 * during rendering, if the referenced element changed.
 *
 * Note: If a ref callback is rendered to a different element position or is
 * removed in a subsequent render, it will first be called with `undefined`,
 * followed by another call with the new element it was rendered to (if any).
 *
 * ```js
 * // Using Ref object
 * const inputRef = createRef();
 * render(html`<input ${ref(inputRef)}>`, container);
 * inputRef.value.focus();
 *
 * // Using callback
 * const callback = (inputElement) => inputElement.focus();
 * render(html`<input ${ref(callback)}>`, container);
 * ```
 */
export const ref = directive(RefDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { RefDirective };
