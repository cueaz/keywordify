/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2023 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { signal } from '@keywordify/signals';
import { afterEach, assert, beforeEach, suite, test } from 'vitest';
import * as K from '~keywords';
import { render } from '../../src/lit-html.js';
import { html } from '../../src/signals/html-tag.js';
import { stripExpressionMarkers } from '../test-utils/strip-markers.js';

suite('html tag', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container?.remove();
  });

  test('watches a signal', () => {
    const count = signal(0);

    render(html`<p>count: ${count}</p>`, container);

    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 0</p>',
    );

    count[K.value] = 1;

    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 1</p>',
    );
  });
});
