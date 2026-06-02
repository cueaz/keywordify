/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { beforeEach, suite, test } from 'vitest';
import { map } from '../../src/directives/map.js';
import { html } from '../../src/lit-html.js';
import { makeAssertRender } from '../test-utils/assert-render.js';

suite('map', () => {
  let container: HTMLDivElement;

  const assertRender = makeAssertRender(() => container);

  beforeEach(() => {
    container = document.createElement('div');
  });
  test('with array', () => {
    assertRender(
      map(['a', 'b', 'c'], (v) => html`<p>${v}</p>`),
      '<p>a</p><p>b</p><p>c</p>',
    );
  });

  test('with empty array', () => {
    assertRender(
      map([], (v) => html`<p>${v}</p>`),
      '',
    );
  });

  test('with undefined', () => {
    assertRender(
      map(undefined, (v) => html`<p>${v}</p>`),
      '',
    );
  });

  test('with iterable', () => {
    function* iterate<T>(items: Array<T>) {
      for (const i of items) {
        yield i;
      }
    }
    assertRender(
      map(iterate(['a', 'b', 'c']), (v) => html`<p>${v}</p>`),
      '<p>a</p><p>b</p><p>c</p>',
    );
  });

  test('passes index', () => {
    assertRender(
      map(['a', 'b', 'c'], (v, i) => html`<p>${v}:${i}</p>`),
      '<p>a:0</p><p>b:1</p><p>c:2</p>',
    );
  });
});
