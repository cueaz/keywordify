/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2018 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import {
  Directive,
  type DirectiveParameters,
  directive,
  type PartInfo,
  PartType,
} from '../directive.js';
import { type AttributePart, noChange } from '../lit-html.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

/**
 * A key-value set of class names to truthy values.
 */
export interface ClassInfo {
  [name: string]: string | boolean | number;
}

class ClassMapDirective extends Directive {
  /**
   * Stores the ClassInfo object applied to a given AttributePart.
   * Used to unset existing values when a new ClassInfo object is applied.
   */
  private [K._previousClasses]?: Set<string>;
  private [K._staticClasses]?: Set<string>;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (
      partInfo[K.type] !== PartType[K.ATTRIBUTE] ||
      partInfo[K.name] !== 'class' ||
      (partInfo[K.strings]?.length as number) > 2
    ) {
      if (DEV_MODE) {
        throw new Error(
          '`classMap()` can only be used in the `class` attribute ' +
            'and must be the only part in the attribute.',
        );
      } else {
        throw new Error();
      }
    }
  }

  [K.render](classInfo: ClassInfo) {
    // Add spaces to ensure separation from static classes
    return (
      ' ' +
      Object.keys(classInfo)
        .filter((key) => classInfo[key])
        .join(' ') +
      ' '
    );
  }

  override [K.update](
    part: AttributePart,
    [classInfo]: DirectiveParameters<this>,
  ) {
    // Remember dynamic classes on the first render
    if (this[K._previousClasses] === undefined) {
      this[K._previousClasses] = new Set();
      if (part[K.strings] !== undefined) {
        this[K._staticClasses] = new Set(
          part[K.strings]
            .join(' ')
            .split(/\s/)
            .filter((s) => s !== ''),
        );
      }
      for (const name in classInfo) {
        if (classInfo[name] && !this[K._staticClasses]?.has(name)) {
          this[K._previousClasses].add(name);
        }
      }
      return this[K.render](classInfo);
    }

    const classList = part[K.element].classList;

    // Remove old classes that no longer apply
    for (const name of this[K._previousClasses]) {
      if (!(name in classInfo)) {
        classList.remove(name);
        this[K._previousClasses].delete(name);
      }
    }

    // Add or remove classes based on their classMap value
    for (const name in classInfo) {
      // We explicitly want a loose truthy check of `value` because it seems
      // more convenient that '' and 0 are skipped.
      const value = !!classInfo[name];
      if (
        value !== this[K._previousClasses].has(name) &&
        !this[K._staticClasses]?.has(name)
      ) {
        if (value) {
          classList.add(name);
          this[K._previousClasses].add(name);
        } else {
          classList.remove(name);
          this[K._previousClasses].delete(name);
        }
      }
    }
    return noChange;
  }
}

/**
 * A directive that applies dynamic CSS classes.
 *
 * This must be used in the `class` attribute and must be the only part used in
 * the attribute. It takes each property in the `classInfo` argument and adds
 * the property name to the element's `classList` if the property value is
 * truthy; if the property value is falsy, the property name is removed from
 * the element's `class`.
 *
 * For example `{foo: bar}` applies the class `foo` if the value of `bar` is
 * truthy.
 *
 * @param classInfo
 */
export const classMap = directive(ClassMapDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { ClassMapDirective };
