/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { type RenderOptions, render } from '../../src/lit-html.js';

const global = globalThis as typeof globalThis & {
  ShadyDOM?: {
    inUse: boolean;
    noPatch: boolean;
    wrap: <T extends Node>(n: T) => T;
  };
};

export interface ShadyRenderOptions extends RenderOptions {
  scope?: string;
}

export const wrap =
  global.ShadyDOM?.inUse && global.ShadyDOM.noPatch === true
    ? global.ShadyDOM!.wrap
    : (node: Node) => node;

export const shadowRoot = (element: Node) =>
  (wrap(element) as Element).shadowRoot;

/**
 * A helper for creating a shadowRoot on an element.
 */
export const renderShadowRoot = (result: unknown, element: Element) => {
  if (!(wrap(element) as Element).shadowRoot) {
    (wrap(element) as Element).attachShadow({ mode: 'open' });
  }
  render(result, (wrap(element) as Element).shadowRoot!, {
    scope: element.localName,
  } as ShadyRenderOptions);
};
