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
  Directive,
  type DirectiveParameters,
  directive,
} from '../directive.js';
import {
  clearPart,
  getCommittedValue,
  insertPart,
  isCompiledTemplateResult,
  isTemplateResult,
  setCommittedValue,
} from '../directive-helpers.js';
import {
  type ChildPart,
  type CompiledTemplateResult,
  nothing,
  type RootPart,
  render,
  type TemplateResult,
} from '../lit-html.js';

/**
 * The template strings array contents are not compatible between the two
 * template result types as the compiled template contains a prepared string;
 * only use the returned template strings array as a cache key.
 */
const getStringsFromTemplateResult = (
  result: TemplateResult | CompiledTemplateResult,
): TemplateStringsArray =>
  isCompiledTemplateResult(result)
    ? result[K._$litType$][K.h]
    : result[K.strings];

class CacheDirective extends Directive {
  private [K._templateCache] = new WeakMap<TemplateStringsArray, RootPart>();
  private [K._value]?: TemplateResult | CompiledTemplateResult | undefined;

  [K.render](v: unknown) {
    // Return an array of the value to induce lit-html to create a ChildPart
    // for the value that we can move into the cache.
    return [v];
  }

  override [K.update](
    containerPart: ChildPart,
    [v]: DirectiveParameters<this>,
  ) {
    const _valueKey = isTemplateResult(this[K._value])
      ? getStringsFromTemplateResult(this[K._value])
      : null;
    const vKey = isTemplateResult(v) ? getStringsFromTemplateResult(v) : null;

    // If the previous value is a TemplateResult and the new value is not,
    // or is a different Template as the previous value, move the child part
    // into the cache.
    if (_valueKey !== null && (vKey === null || _valueKey !== vKey)) {
      // This is always an array because we return [v] in render()
      const partValue = getCommittedValue(containerPart) as Array<ChildPart>;
      const childPart = partValue.pop()!;
      let cachedContainerPart = this[K._templateCache].get(_valueKey);
      if (cachedContainerPart === undefined) {
        const fragment = document.createDocumentFragment();
        cachedContainerPart = render(nothing, fragment);
        cachedContainerPart[K.setConnected](false);
        this[K._templateCache].set(_valueKey, cachedContainerPart);
      }
      // Move into cache
      setCommittedValue(cachedContainerPart, [childPart]);
      insertPart(cachedContainerPart, undefined, childPart);
    }
    // If the new value is a TemplateResult and the previous value is not,
    // or is a different Template as the previous value, restore the child
    // part from the cache.
    if (vKey !== null) {
      if (_valueKey === null || _valueKey !== vKey) {
        const cachedContainerPart = this[K._templateCache].get(vKey);
        if (cachedContainerPart !== undefined) {
          // Move the cached part back into the container part value
          const partValue = getCommittedValue(
            cachedContainerPart,
          ) as Array<ChildPart>;
          const cachedPart = partValue.pop()!;
          // Move cached part back into DOM
          clearPart(containerPart);
          insertPart(containerPart, undefined, cachedPart);
          setCommittedValue(containerPart, [cachedPart]);
        }
      }
      // Because vKey is non null, v must be a TemplateResult.
      this[K._value] = v as TemplateResult | CompiledTemplateResult;
    } else {
      this[K._value] = undefined;
    }
    return this[K.render](v);
  }
}

/**
 * Enables fast switching between multiple templates by caching the DOM nodes
 * and TemplateInstances produced by the templates.
 *
 * Example:
 *
 * ```js
 * let checked = false;
 *
 * html`
 *   ${cache(checked ? html`input is checked` : html`input is not checked`)}
 * `
 * ```
 */
export const cache = directive(CacheDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { CacheDirective };
