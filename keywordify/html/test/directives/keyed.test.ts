/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert, beforeEach, suite, test } from 'vitest';
import { keyed } from '../../src/directives/keyed.js';
import { html, render } from '../../src/lit-html.js';
import { stripExpressionMarkers } from '../test-utils/strip-markers.js';

suite('keyed directive', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('re-renders when the key changes', () => {
    const go = (k: unknown) =>
      render(keyed(k, html`<div .foo=${k}></div>`), container);

    // Initial render
    go(1);
    const div = container.firstElementChild;
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal((div as unknown as { foo?: unknown }).foo, 1);

    // Rerendering with same key should reuse the DOM
    go(1);
    const div2 = container.firstElementChild;
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal((div2 as unknown as { foo?: unknown }).foo, 1);
    assert.strictEqual(div, div2);

    // Rerendering with a different key should not reuse the DOM
    go(2);
    const div3 = container.firstElementChild;
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal((div3 as unknown as { foo?: unknown }).foo, 2);
    assert.notStrictEqual(div, div3);
  });
});
