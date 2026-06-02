/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2018 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  afterAll,
  afterEach,
  assert,
  beforeAll,
  beforeEach,
  suite,
  test,
} from 'vitest';
import * as K from '~keywords';
import { html } from '../src/lit-html.js';

// Note, since tests are not built with production support, detect DEV_MODE
// by checking if warning API is available.
const DEV_MODE = import.meta.custom.DEV_MODE;

const global = globalThis as typeof globalThis & {
  [K.litIssuedWarnings]?: Set<string>;
};

suite.skipIf(!DEV_MODE)('Developer mode warnings', () => {
  let container: HTMLElement;

  const consoleWarn = console.warn;

  beforeAll(() => {
    console.warn = () => {};
  });

  afterAll(() => {
    console.warn = consoleWarn;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  const litWarnings = global[K.litIssuedWarnings]!;

  test('warns for dev mode only 1x', () => {
    // Ensure lit-html package is imported
    void html``;
    // Ensure the warning message was issued
    assert.equal(
      Array.from(litWarnings).filter((v) => v?.includes('dev mode')).length,
      1,
    );
  });
});
