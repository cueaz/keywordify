/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2020 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import * as K from '~keywords';
import { Directive, directive, type PartInfo, PartType } from '../directive.js';
import { noChange } from '../lit-html.js';

const DEV_MODE = import.meta.custom.DEV_MODE;

class TemplateContentDirective extends Directive {
  private [K._previousTemplate]?: HTMLTemplateElement;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo[K.type] !== PartType[K.CHILD]) {
      if (DEV_MODE) {
        throw new Error('templateContent can only be used in child bindings');
      } else {
        throw new Error();
      }
    }
  }

  [K.render](template: HTMLTemplateElement) {
    if (this[K._previousTemplate] === template) {
      return noChange;
    }
    this[K._previousTemplate] = template;
    return document.importNode(template.content, true);
  }
}

/**
 * Renders the content of a template element as HTML.
 *
 * Note, the template should be developer controlled and not user controlled.
 * Rendering a user-controlled template with this directive
 * could lead to cross-site-scripting vulnerabilities.
 */
export const templateContent = directive(TemplateContentDirective);

/**
 * The type of the class that powers this directive. Necessary for naming the
 * directive's return type.
 */
export type { TemplateContentDirective };
