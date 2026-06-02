/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2019 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import type {
  Directive,
  DirectiveClass,
  DirectiveResult,
  PartInfo,
} from './directive.js';
import type {
  BooleanAttributePart,
  ChildPart,
  ElementPart,
  EventPart,
  PropertyPart,
  TemplateInstance,
} from './lit-html.js';
import {
  type AttributePart,
  type Disconnectable,
  noChange,
  type Part,
  _$LH as p,
} from './lit-html.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

// Contains either the minified or unminified `_$resolve` Directive method name.
let resolveMethodName: Extract<keyof Directive, typeof K._$resolve> | null =
  null;

/**
 * END USERS SHOULD NOT RELY ON THIS OBJECT.
 *
 * We currently do not make a mangled rollup build of the lit-ssr code. In order
 * to keep a number of (otherwise private) top-level exports mangled in the
 * client side code, we export a _$LH object containing those members (or
 * helper methods for accessing private fields of those members), and then
 * re-export them for use in lit-ssr. This keeps lit-ssr agnostic to whether the
 * client-side code is being used in `dev` mode or `prod` mode.
 * @private
 */
export const _$LH = {
  [K.boundAttributeSuffix]: p[K._boundAttributeSuffix],
  [K.marker]: p[K._marker],
  [K.markerMatch]: p[K._markerMatch],
  [K.HTML_RESULT]: p[K._HTML_RESULT],
  [K.getTemplateHtml]: p[K._getTemplateHtml],
  [K.overrideDirectiveResolve]: (
    directiveClass: new (
      part: PartInfo,
    ) => Directive & { [K.render](): unknown },
    resolveOverrideFn: (directive: Directive, values: unknown[]) => unknown,
  ) =>
    class extends directiveClass {
      override [K._$resolve](
        this: Directive,
        _part: Part,
        values: unknown[],
      ): unknown {
        return resolveOverrideFn(this, values);
      }
    },
  [K.patchDirectiveResolve]: (
    directiveClass: typeof Directive,
    resolveOverrideFn: (
      this: Directive,
      _part: Part,
      values: unknown[],
    ) => unknown,
  ) => {
    if (directiveClass.prototype[K._$resolve].name !== resolveOverrideFn.name) {
      resolveMethodName ??= directiveClass.prototype[K._$resolve]
        .name as NonNullable<typeof resolveMethodName>;
      for (
        let proto = directiveClass.prototype;
        proto !== Object.prototype;
        proto = Object.getPrototypeOf(proto)
      ) {
        if (Object.hasOwn(proto, resolveMethodName)) {
          proto[resolveMethodName] = resolveOverrideFn;
          return;
        }
      }
      // Nothing was patched which indicates an error. The most likely error is
      // that somehow both minified and unminified lit code passed through this
      // codepath. This is possible as lit-labs/ssr contains its own lit-html
      // module as a dependency for server rendering client Lit code. If a
      // client contains multiple duplicate Lit modules with minified and
      // unminified exports, we currently cannot handle both.
      if (DEV_MODE) {
        throw new Error(
          `Internal error: It is possible that both dev mode and production mode` +
            ` Lit was mixed together during SSR. Please comment on the issue: ` +
            `https://github.com/lit/lit/issues/4527`,
        );
      } else {
        throw new Error();
      }
    }
  },
  [K.setDirectiveClass](
    value: DirectiveResult,
    directiveClass: DirectiveClass,
  ) {
    // This property needs to remain unminified.
    value[K._$litDirective$] = directiveClass;
  },
  [K.getAttributePartCommittedValue]: (
    part: AttributePart,
    value: unknown,
    index: number | undefined,
  ) => {
    // Use the part setter to resolve directives/concatenate multiple parts
    // into a final value (captured by passing in a commitValue override)
    let committedValue: unknown = noChange;
    // Note that _commitValue need not be in `stableProperties` because this
    // method is only run on `AttributePart`s created by lit-ssr using the same
    // version of the library as this file
    part[K._commitValue] = (value: unknown) => (committedValue = value);
    part[K._$setValue](value, part, index);
    return committedValue;
  },
  [K.connectedDisconnectable]: (props?: object): Disconnectable => ({
    ...props,
    [K._$isConnected]: true,
  }),
  [K.resolveDirective]: p[K._resolveDirective],
  [K.AttributePart]: p[K._AttributePart],
  [K.PropertyPart]: p[K._PropertyPart] as typeof PropertyPart,
  [K.BooleanAttributePart]: p[
    K._BooleanAttributePart
  ] as typeof BooleanAttributePart,
  [K.EventPart]: p[K._EventPart] as typeof EventPart,
  [K.ElementPart]: p[K._ElementPart] as typeof ElementPart,
  [K.TemplateInstance]: p[K._TemplateInstance] as typeof TemplateInstance,
  [K.isIterable]: p[K._isIterable],
  [K.ChildPart]: p[K._ChildPart] as typeof ChildPart,
};
