/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2023 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { computed, signal } from '@keywordify/signals';
import { afterEach, assert, beforeEach, suite, test } from 'vitest';
import * as K from '~keywords';
import { cache } from '../../src/directives/cache.js';
import { render } from '../../src/lit-html.js';
import { html } from '../../src/signals/html-tag.js';
import { watch } from '../../src/signals/watch.js';
import { stripExpressionMarkers } from '../test-utils/strip-markers.js';

suite('watch directive', () => {
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

    render(html`<p>count: ${watch(count)}</p>`, container);

    // Initial render evaluates the signal synchronously
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 0</p>',
    );

    // The DOM updates immediately because of the signal update via watch
    count[K.value] = 1;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 1</p>',
    );
  });

  test('unsubscribes to a signal on element disconnect', () => {
    let readCount = 0;
    const count = signal(0);
    const countPlusOne = computed(() => {
      readCount++;
      return count[K.value] + 1;
    });

    const rootPart = render(
      html`<p>count: ${watch(countPlusOne)}</p>`,
      container,
    );

    // First render, expect one read of the signal
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 1</p>',
    );
    assert.equal(readCount, 1);

    // Force the directive to disconnect
    rootPart[K.setConnected](false);

    // Expect no reads while disconnected
    count[K.value] = 1;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 1</p>',
    );
    assert.equal(readCount, 1);

    // Force the directive to reconnect
    rootPart[K.setConnected](true);

    // So when reconnected, we read the signal value again
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 2</p>',
    );
    assert.equal(readCount, 2);

    // And signal updates propagate again
    count[K.value] = 2;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>count: 3</p>',
    );
    assert.equal(readCount, 3);
  });

  test('unsubscribes to a signal on directive disconnect', () => {
    let readCount = 0;
    const count = signal(0);
    const countPlusOne = computed(() => {
      readCount++;
      return count[K.value] + 1;
    });

    const signalTemplate = html`${watch(countPlusOne)}`;

    const stringTemplate = html`string`;

    const template = (renderWithSignal: boolean) => {
      const t = renderWithSignal ? signalTemplate : stringTemplate;
      // Cache the expression so that we preserve the directive instance
      // and trigger the reconnected code-path.
      // TODO (justinfagnani): it would be nice if we could assert that we
      // really did trigger reconnected instead of rendering a new directive,
      // but we don't want to code the directive to specifically leave a trace
      // of reconnected-ness.
      return html`<p>value: ${cache(t)}</p>`;
    };

    render(template(true), container);

    // First render with the signal, expect one read of the signal
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>value: 1</p>',
    );
    assert.equal(readCount, 1);

    // Render with a non-signal
    render(template(false), container);

    // Expect no reads while disconnected
    count[K.value] = 1;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>value: string</p>',
    );
    assert.equal(readCount, 1);

    // Render with the signal again
    render(template(true), container);

    // Render should use the new value
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>value: 2</p>',
    );
    assert.equal(readCount, 2);

    // And signal updates propagate again
    count[K.value] = 2;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<p>value: 3</p>',
    );
    assert.equal(readCount, 3);
  });
});
