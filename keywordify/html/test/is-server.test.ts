/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2022 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert, suite, test } from 'vitest';
import { isServer } from '../src/is-server.js';

suite('is-server', () => {
  test('isServer is false', () => {
    assert.strictEqual(isServer, false);
  });
});
