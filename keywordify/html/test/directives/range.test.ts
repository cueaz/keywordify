/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert, suite, test } from 'vitest';
import { range } from '../../src/directives/range.js';

suite('range', () => {
  test('positive end', () => {
    assert.deepEqual([...range(0)], []);
    assert.deepEqual([...range(3)], [0, 1, 2]);
  });

  test('start and end', () => {
    assert.deepEqual([...range(0, 3)], [0, 1, 2]);
    assert.deepEqual([...range(-1, 1)], [-1, 0]);
    assert.deepEqual([...range(-2, -1)], [-2]);
  });

  test('end < start', () => {
    // This case checks that we don't cause an infinite loop
    assert.deepEqual([...range(2, 1)], []);
  });

  test('custom step', () => {
    assert.deepEqual([...range(0, 10, 3)], [0, 3, 6, 9]);
  });

  test('negative step', () => {
    assert.deepEqual([...range(0, -3, -1)], [0, -1, -2]);
    // This case checks that we don't cause an infinite loop
    assert.deepEqual([...range(0, 10, -1)], []);
  });
});
