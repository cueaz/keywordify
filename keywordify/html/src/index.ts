/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  html as coreHtml,
  mathml as coreMathml,
  svg as coreSvg,
} from './lit-html.js';
import { withWatch } from './signals/html-tag.js';
import { withStatic } from './static.js';

export * from './async-directive.js';
export * from './directive.js';
export * from './directive-helpers.js';
export * from './directives/async-append.js';
export * from './directives/async-replace.js';
export * from './directives/cache.js';
export * from './directives/choose.js';
export * from './directives/class-map.js';
export * from './directives/guard.js';
export * from './directives/if-defined.js';
export * from './directives/join.js';
export * from './directives/keyed.js';
export * from './directives/live.js';
export * from './directives/map.js';
export * from './directives/range.js';
export * from './directives/ref.js';
export * from './directives/repeat.js';
export * from './directives/style-map.js';
export * from './directives/template-content.js';
// export * from './directives/unsafe-html.js';
// export * from './directives/unsafe-mathml.js';
// export * from './directives/unsafe-svg.js';
export * from './directives/until.js';
export * from './directives/when.js';
export * from './is-server.js';
export * from './lit-html.js';
export { withWatch } from './signals/html-tag.js';
export * from './signals/watch.js';
export {
  literal,
  type StaticValue,
  unsafeStatic,
  withStatic,
} from './static.js';

export const html = withWatch(
  withStatic(coreHtml) as typeof coreHtml,
) as typeof coreHtml;

export const svg = withWatch(
  withStatic(coreSvg) as typeof coreSvg,
) as typeof coreSvg;

export const mathml = withWatch(
  withStatic(coreMathml) as typeof coreMathml,
) as typeof coreMathml;
