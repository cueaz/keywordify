/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { beforeEach, suite, test } from 'vitest';
import { when } from '../../src/directives/when.js';
import { html } from '../../src/lit-html.js';
import { makeAssertRender } from '../test-utils/assert-render.js';

suite('when', () => {
  let container: HTMLDivElement;

  const assertRender = makeAssertRender(() => container);

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('true condition with false case', () => {
    assertRender(
      when(
        true,
        () => html`X`,
        () => html`Y`,
      ),
      'X',
    );
  });

  test('true condition without false case', () => {
    assertRender(
      when(true, () => html`X`),
      'X',
    );
  });

  test('false condition with false case', () => {
    assertRender(
      when(
        false,
        () => html`X`,
        () => html`Y`,
      ),
      'Y',
    );
  });

  test('false condition without false case', () => {
    assertRender(
      when(false, () => html`X`),
      '',
    );
  });
});
