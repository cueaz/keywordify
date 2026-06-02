/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { beforeEach, suite, test } from 'vitest';
import { join } from '../../src/directives/join.js';
import { html } from '../../src/lit-html.js';
import { makeAssertRender } from '../test-utils/assert-render.js';

suite('join', () => {
  let container: HTMLDivElement;

  const assertRender = makeAssertRender(() => container);

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('with array', () => {
    assertRender(join(['a', 'b', 'c'], ','), 'a,b,c');
  });

  test('with empty array', () => {
    assertRender(join([], ','), '');
  });

  test('with undefined', () => {
    assertRender(join(undefined, ','), '');
  });

  test('with iterable', () => {
    function* iterate<T>(items: Array<T>) {
      for (const i of items) {
        yield i;
      }
    }
    assertRender(join(iterate(['a', 'b', 'c']), ','), 'a,b,c');
  });

  test('passes index', () => {
    assertRender(
      join(['a', 'b', 'c'], (i) => html`<p>${i}</p>`),
      'a<p>0</p>b<p>1</p>c',
    );
  });
});
