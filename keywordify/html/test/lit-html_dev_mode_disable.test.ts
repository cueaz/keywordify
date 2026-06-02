/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2018 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert, suite, test } from 'vitest';
import * as K from '~keywords';
import { html } from '../src/lit-html.js';

// Note, since tests are not built with production support, detect DEV_MODE
// by checking if warning API is available.
const DEV_MODE = import.meta.custom.DEV_MODE;

const global = globalThis as typeof globalThis & {
  [K.litIssuedWarnings]?: Set<string>;
};

if (DEV_MODE) {
  global[K.litIssuedWarnings] ??= new Set();
  global[K.litIssuedWarnings].add('dev-mode');
}

suite.skipIf(!DEV_MODE)('Can disable developer mode warning', () => {
  const litWarnings = global[K.litIssuedWarnings]!;

  test('dev mode warning was disabled', () => {
    // Ensure lit-html package is imported
    void html``;
    // Ensure the warning message wasn't issued
    assert.lengthOf(
      Array.from(litWarnings).filter((v) => v?.includes('dev mode')),
      0,
    );
    // Ensure warning code is still present (to silence the warning)
    assert.lengthOf(
      Array.from(litWarnings).filter((v) => v?.includes('dev-mode')),
      1,
    );
    assert.equal(litWarnings?.size, 1);
  });
});
