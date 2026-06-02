/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import type { Disconnectable, Part } from './lit-html.js';

export type {
  AttributePart,
  BooleanAttributePart,
  ChildPart,
  ElementPart,
  EventPart,
  Part,
  PropertyPart,
} from './lit-html.js';

export interface DirectiveClass {
  new (part: PartInfo): Directive;
}

/**
 * This utility type extracts the signature of a directive class's render()
 * method so we can use it for the type of the generated directive function.
 */
export type DirectiveParameters<C extends Directive> = Parameters<
  C[typeof K.render]
>;

/**
 * A generated directive function doesn't evaluate the directive, but just
 * returns a DirectiveResult object that captures the arguments.
 */
export interface DirectiveResult<C extends DirectiveClass = DirectiveClass> {
  /**
   * This property needs to remain unminified.
   * @internal
   */
  [K._$litDirective$]: C;
  /** @internal */
  [K.values]: DirectiveParameters<InstanceType<C>>;
}

export const PartType = {
  [K.ATTRIBUTE]: 1,
  [K.CHILD]: 2,
  [K.PROPERTY]: 3,
  [K.BOOLEAN_ATTRIBUTE]: 4,
  [K.EVENT]: 5,
  [K.ELEMENT]: 6,
} as const;

export type PartType = (typeof PartType)[keyof typeof PartType];

export interface ChildPartInfo {
  readonly [K.type]: (typeof PartType)[typeof K.CHILD];
}

export interface AttributePartInfo {
  readonly [K.type]:
    | (typeof PartType)[typeof K.ATTRIBUTE]
    | (typeof PartType)[typeof K.PROPERTY]
    | (typeof PartType)[typeof K.BOOLEAN_ATTRIBUTE]
    | (typeof PartType)[typeof K.EVENT];
  readonly [K.strings]?: ReadonlyArray<string>;
  readonly [K.name]: string;
  readonly [K.tagName]: string;
}

export interface ElementPartInfo {
  readonly [K.type]: (typeof PartType)[typeof K.ELEMENT];
}

/**
 * Information about the part a directive is bound to.
 *
 * This is useful for checking that a directive is attached to a valid part,
 * such as with directive that can only be used on attribute bindings.
 */
export type PartInfo = ChildPartInfo | AttributePartInfo | ElementPartInfo;

/**
 * Creates a user-facing directive function from a Directive class. This
 * function has the same parameters as the directive's render() method.
 */
export const directive =
  <C extends DirectiveClass>(c: C) =>
  (...values: DirectiveParameters<InstanceType<C>>): DirectiveResult<C> => ({
    // This property needs to remain unminified.
    [K._$litDirective$]: c,
    [K.values]: values,
  });

/**
 * Base class for creating custom directives. Users should extend this class,
 * implement `render` and/or `update`, and then pass their subclass to
 * `directive`.
 */
export abstract class Directive implements Disconnectable {
  //@internal
  [K.__part]!: Part;
  //@internal
  [K.__attributeIndex]: number | undefined;
  //@internal
  [K.__directive]?: Directive | undefined;

  //@internal
  [K._$parent]!: Disconnectable;

  // These will only exist on the AsyncDirective subclass
  //@internal
  [K._$disconnectableChildren]?: Set<Disconnectable>;
  // This property needs to remain unminified.
  //@internal
  [K._$notifyDirectiveConnectionChanged]?(isConnected: boolean): void;

  constructor(_partInfo: PartInfo) {
    void _partInfo;
  }

  // See comment in Disconnectable interface for why this is a getter
  get [K._$isConnected]() {
    return this[K._$parent][K._$isConnected];
  }

  /** @internal */
  [K._$initialize](
    part: Part,
    parent: Disconnectable,
    attributeIndex: number | undefined,
  ) {
    this[K.__part] = part;
    this[K._$parent] = parent;
    this[K.__attributeIndex] = attributeIndex;
  }
  /** @internal */
  [K._$resolve](part: Part, props: Array<unknown>): unknown {
    return this[K.update](part, props);
  }

  abstract [K.render](...props: Array<unknown>): unknown;

  [K.update](_part: Part, props: Array<unknown>): unknown {
    return this[K.render](...props);
  }
}
