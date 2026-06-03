/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2020 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Any new exports need to be added to the export statement in
// `packages/lit/src/index.all.ts`.

import * as K from '~keywords';
import {
  html as coreHtml,
  mathml as coreMathml,
  svg as coreSvg,
  type TemplateResult,
} from './lit-html.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

export interface StaticValue {
  /** The value to interpolate as-is into the template. */
  [K._$litStatic$]: string;

  /**
   * A value that can't be decoded from ordinary JSON, make it harder for
   * an attacker-controlled data that goes through JSON.parse to produce a valid
   * StaticValue.
   */
  [K.r]: typeof brand;
}

/**
 * Prevents JSON injection attacks.
 *
 * The goals of this brand:
 *   1) fast to check
 *   2) code is small on the wire
 *   3) multiple versions of Lit in a single page will all produce mutually
 *      interoperable StaticValues
 *   4) normal JSON.parse (without an unusual reviver) can not produce a
 *      StaticValue
 *
 * Symbols satisfy (1), (2), and (4). We use Symbol.for to satisfy (3), but
 * we don't care about the key, so we break ties via (2) and use the empty
 * string.
 */
const brand = Symbol.for(K.LIT_STATIC);

/** Safely extracts the string part of a StaticValue. */
const unwrapStaticValue = (value: unknown): string | undefined => {
  if ((value as Partial<StaticValue>)?.[K.r] !== brand) {
    return undefined;
  }
  return (value as Partial<StaticValue>)?.[K._$litStatic$];
};

/**
 * Wraps a string so that it behaves like part of the static template
 * strings instead of a dynamic value.
 *
 * Users must take care to ensure that adding the static string to the template
 * results in well-formed HTML, or else templates may break unexpectedly.
 *
 * Note that this function is unsafe to use on untrusted content, as it will be
 * directly parsed into HTML. Do not pass user input to this function
 * without sanitizing it.
 *
 * Static values can be changed, but they will cause a complete re-render
 * since they effectively create a new template.
 */
export const unsafeStatic = (value: string): StaticValue => ({
  [K._$litStatic$]: value,
  [K.r]: brand,
});

const textFromStatic = (value: StaticValue) => {
  if (value[K._$litStatic$] !== undefined) {
    return value[K._$litStatic$];
  } else {
    if (DEV_MODE) {
      throw new Error(
        `Value passed to 'literal' function must be a 'literal' result: ${value}. ` +
          `Use 'unsafeStatic' to pass non-literal values, but take care to ensure page security.`,
      );
    } else {
      throw new Error();
    }
  }
};

/**
 * Tags a string literal so that it behaves like part of the static template
 * strings instead of a dynamic value.
 *
 * The only values that may be used in template expressions are other tagged
 * `literal` results or `unsafeStatic` values (note that untrusted content
 * should never be passed to `unsafeStatic`).
 *
 * Users must take care to ensure that adding the static string to the template
 * results in well-formed HTML, or else templates may break unexpectedly.
 *
 * Static values can be changed, but they will cause a complete re-render since
 * they effectively create a new template.
 */
export const literal = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): StaticValue => ({
  [K._$litStatic$]: values.reduce(
    (acc, v, idx) => acc + textFromStatic(v as StaticValue) + strings[idx + 1],
    strings[0],
  ) as string,
  [K.r]: brand,
});

const stringsCache = new Map<string, TemplateStringsArray>();

/**
 * Wraps a lit-html template tag (`html` or `svg`) to add static value support.
 */
export const withStatic =
  (coreTag: typeof coreHtml | typeof coreSvg | typeof coreMathml) =>
  (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
    const l = values.length;
    let staticValue: string | undefined;
    let dynamicValue: unknown;
    const staticStrings: Array<string> = [];
    const dynamicValues: Array<unknown> = [];
    let i = 0;
    let hasStatics = false;
    let s: string;

    while (i < l) {
      s = strings[i]!;
      // Collect any unsafeStatic values, and their following template strings
      // so that we treat a run of template strings and unsafe static values as
      // a single template string.
      while (i < l) {
        dynamicValue = values[i];
        staticValue = unwrapStaticValue(dynamicValue);
        if (staticValue === undefined) {
          break;
        }
        s += staticValue + strings[++i]!;
        hasStatics = true;
      }
      // If the last value is static, we don't need to push it.
      if (i !== l) {
        dynamicValues.push(dynamicValue);
      }
      staticStrings.push(s);
      i++;
    }
    // If the last value isn't static (which would have consumed the last
    // string), then we need to add the last string.
    if (i === l) {
      staticStrings.push(strings[l]!);
    }

    if (hasStatics) {
      const key = staticStrings.join('\0');
      let cachedStrings = stringsCache.get(key);
      if (cachedStrings === undefined) {
        // Beware: in general this pattern is unsafe, and doing so may bypass
        // lit's security checks and allow an attacker to execute arbitrary
        // code and inject arbitrary content.
        (staticStrings as unknown as { raw: readonly string[] }).raw =
          staticStrings;
        cachedStrings = staticStrings as unknown as TemplateStringsArray;
        stringsCache.set(key, cachedStrings);
      }
      strings = cachedStrings;
      values = dynamicValues;
    }
    return coreTag(strings, ...values);
  };

/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * Includes static value support from `lit-html/static.js`.
 */
export const html = withStatic(coreHtml);

/**
 * Interprets a template literal as an SVG template that can efficiently
 * render to and update a container.
 *
 * Includes static value support from `lit-html/static.js`.
 */
export const svg = withStatic(coreSvg);

/**
 * Interprets a template literal as MathML fragment that can efficiently render
 * to and update a container.
 *
 * Includes static value support from `lit-html/static.js`.
 */
export const mathml = withStatic(coreMathml);
