/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2023 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type { Subscribable } from '@keywordify/signals';
import * as K from '~keywords';
import {
  html as coreHtml,
  mathml as coreMathml,
  svg as coreSvg,
  type TemplateResult,
} from '../lit-html.js';
import { watch } from './watch.js';

const BRAND_SYMBOL = Symbol.for(K.PREACT_SIGNALS);

/**
 * Wraps a lit-html template tag function (`html` or `svg`) to add support for
 * automatically wrapping Signal instances in the `watch()` directive.
 */
export const withWatch =
  (coreTag: typeof coreHtml | typeof coreSvg | typeof coreMathml) =>
  (strings: TemplateStringsArray, ...values: unknown[]): TemplateResult => {
    // TODO (justinfagnani): use an alternative to instanceof when
    // one is available. See https://github.com/preactjs/signals/issues/402
    // We duck-type using the exported K.brand symbol.
    for (let i = 0, l = values.length; i < l; i++) {
      const v = values[i];
      if ((v as { [K.brand]?: unknown })?.[K.brand] === BRAND_SYMBOL) {
        values[i] = watch(v as Subscribable);
      }
    }
    return coreTag(strings, ...values);
  };

/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 *
 * Includes signal watching support from `withWatch()`.
 */
export const html = withWatch(coreHtml);

/**
 * Interprets a template literal as an SVG template that can efficiently
 * render to and update a container.
 *
 * Includes signal watching support from `withWatch()`.
 */
export const svg = withWatch(coreSvg);

/**
 * Interprets a template literal as MathML fragment that can efficiently render
 * to and update a container.
 *
 * Includes signal watching support from `withWatch()`.
 */
export const mathml = withWatch(coreMathml);
