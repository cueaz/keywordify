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
import type {
  AttributePartInfo,
  DirectiveClass,
  DirectiveResult,
  PartInfo,
} from './directive.js';
import {
  _$LH,
  type CompiledTemplateResult,
  type DirectiveParent,
  type MaybeCompiledTemplateResult,
  type Part,
  type UncompiledTemplateResult,
} from './lit-html.js';

const global = globalThis as typeof globalThis & {
  ShadyDOM?: {
    inUse: boolean;
    noPatch: boolean;
    wrap: <T extends Node>(n: T) => T;
  };
};

type Primitive = null | undefined | boolean | number | string | symbol | bigint;

const { [K._ChildPart]: ChildPart } = _$LH;

type ChildPart = InstanceType<typeof ChildPart>;

const ENABLE_SHADYDOM_NOPATCH = false;

const wrap =
  ENABLE_SHADYDOM_NOPATCH &&
  global.ShadyDOM?.inUse &&
  global.ShadyDOM?.noPatch === true
    ? global.ShadyDOM!.wrap
    : (node: Node) => node;

/**
 * Tests if a value is a primitive value.
 *
 * See https://tc39.github.io/ecma262/#sec-typeof-operator
 */
export const isPrimitive = (value: unknown): value is Primitive =>
  value === null ||
  (typeof value !== RK.object && typeof value !== RK.function);

export const TemplateResultType = {
  [K.HTML]: 1,
  [K.SVG]: 2,
  [K.MATHML]: 3,
} as const;

export type TemplateResultType =
  (typeof TemplateResultType)[keyof typeof TemplateResultType];

type IsTemplateResult = {
  (val: unknown): val is MaybeCompiledTemplateResult;
  <T extends TemplateResultType>(
    val: unknown,
    type: T,
  ): val is UncompiledTemplateResult<T>;
};

/**
 * Tests if a value is a TemplateResult or a CompiledTemplateResult.
 */
export const isTemplateResult: IsTemplateResult = (
  value: unknown,
  type?: TemplateResultType,
): value is UncompiledTemplateResult =>
  type === undefined
    ? // This property needs to remain unminified.
      (value as UncompiledTemplateResult)?.[K._$litType$] !== undefined
    : (value as UncompiledTemplateResult)?.[K._$litType$] === type;

/**
 * Tests if a value is a CompiledTemplateResult.
 */
export const isCompiledTemplateResult = (
  value: unknown,
): value is CompiledTemplateResult => {
  return (value as CompiledTemplateResult)?.[K._$litType$]?.[K.h] != null;
};

/**
 * Tests if a value is a DirectiveResult.
 */
export const isDirectiveResult = (value: unknown): value is DirectiveResult =>
  // This property needs to remain unminified.
  (value as DirectiveResult)?.[K._$litDirective$] !== undefined;

/**
 * Retrieves the Directive class for a DirectiveResult
 */
export const getDirectiveClass = (value: unknown): DirectiveClass | undefined =>
  // This property needs to remain unminified.
  (value as DirectiveResult)?.[K._$litDirective$];

/**
 * Tests whether a part has only a single-expression with no strings to
 * interpolate between.
 *
 * Only AttributePart and PropertyPart can have multiple expressions.
 * Multi-expression parts have a `strings` property and single-expression
 * parts do not.
 */
export const isSingleExpression = (part: PartInfo) =>
  (part as AttributePartInfo)[K.strings] === undefined;

const createMarker = () => document.createComment('');

/**
 * Inserts a ChildPart into the given container ChildPart's DOM, either at the
 * end of the container ChildPart, or before the optional `refPart`.
 *
 * This does not add the part to the containerPart's committed value. That must
 * be done by callers.
 *
 * @param containerPart Part within which to add the new ChildPart
 * @param refPart Part before which to add the new ChildPart; when omitted the
 *     part added to the end of the `containerPart`
 * @param part Part to insert, or undefined to create a new part
 */
export const insertPart = (
  containerPart: ChildPart,
  refPart?: ChildPart,
  part?: ChildPart,
): ChildPart => {
  const container = wrap(containerPart[K._$startNode]).parentNode!;

  const refNode =
    refPart === undefined ? containerPart[K._$endNode] : refPart[K._$startNode];

  if (part === undefined) {
    const startNode = wrap(container).insertBefore(createMarker(), refNode);
    const endNode = wrap(container).insertBefore(createMarker(), refNode);
    part = new ChildPart(
      startNode,
      endNode,
      containerPart,
      containerPart[K.options],
    );
  } else {
    const endNode = wrap(part[K._$endNode]!).nextSibling;
    const oldParent = part[K._$parent];
    const parentChanged = oldParent !== containerPart;
    if (parentChanged) {
      part[K._$reparentDisconnectables]?.(containerPart);
      // Note that although `_$reparentDisconnectables` updates the part's
      // `_$parent` reference after unlinking from its current parent, that
      // method only exists if Disconnectables are present, so we need to
      // unconditionally set it here
      part[K._$parent] = containerPart;
      // Since the _$isConnected getter is somewhat costly, only
      // read it once we know the subtree has directives that need
      // to be notified
      if (part[K._$notifyConnectionChanged] !== undefined) {
        const newConnectionState = containerPart[K._$isConnected];
        if (newConnectionState !== oldParent![K._$isConnected]) {
          part[K._$notifyConnectionChanged](newConnectionState);
        }
      }
    }
    if (endNode !== refNode || parentChanged) {
      let start: Node | null = part[K._$startNode];
      while (start !== endNode) {
        const n: Node | null = wrap(start!).nextSibling;
        wrap(container).insertBefore(start!, refNode);
        start = n;
      }
    }
  }

  return part;
};

/**
 * Sets the value of a Part.
 *
 * Note that this should only be used to set/update the value of user-created
 * parts (i.e. those created using `insertPart`); it should not be used
 * by directives to set the value of the directive's container part. Directives
 * should return a value from `update`/`render` to update their part state.
 *
 * For directives that require setting their part value asynchronously, they
 * should extend `AsyncDirective` and call `this.setValue()`.
 *
 * @param part Part to set
 * @param value Value to set
 * @param index For `AttributePart`s, the index to set
 * @param directiveParent Used internally; should not be set by user
 */
export const setChildPartValue = <T extends ChildPart>(
  part: T,
  value: unknown,
  directiveParent: DirectiveParent = part,
): T => {
  part[K._$setValue](value, directiveParent);
  return part;
};

// A sentinel value that can never appear as a part value except when set by
// live(). Used to force a dirty-check to fail and cause a re-render.
const RESET_VALUE = {};

/**
 * Sets the committed value of a ChildPart directly without triggering the
 * commit stage of the part.
 *
 * This is useful in cases where a directive needs to update the part such
 * that the next update detects a value change or not. When value is omitted,
 * the next update will be guaranteed to be detected as a change.
 *
 * @param part
 * @param value
 */
export const setCommittedValue = (part: Part, value: unknown = RESET_VALUE) =>
  (part[K._$committedValue] = value);

/**
 * Returns the committed value of a ChildPart.
 *
 * The committed value is used for change detection and efficient updates of
 * the part. It can differ from the value set by the template or directive in
 * cases where the template value is transformed before being committed.
 *
 * - `TemplateResult`s are committed as a `TemplateInstance`
 * - Iterables are committed as `Array<ChildPart>`
 * - All other types are committed as the template value or value returned or
 *   set by a directive.
 *
 * @param part
 */
export const getCommittedValue = (part: ChildPart) => part[K._$committedValue];

/**
 * Removes a ChildPart from the DOM, including any of its content and markers.
 *
 * Note: The only difference between this and clearPart() is that this also
 * removes the part's start node. This means that the ChildPart must own its
 * start node, ie it must be a marker node specifically for this part and not an
 * anchor from surrounding content.
 *
 * @param part The Part to remove
 */
export const removePart = (part: ChildPart) => {
  part[K._$clear]();
  part[K._$startNode].remove();
};

export const clearPart = (part: ChildPart) => {
  part[K._$clear]();
};
