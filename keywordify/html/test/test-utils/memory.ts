/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { suite } from 'vitest';

export const global = globalThis as typeof globalThis & {
  gc: () => void;
  performance: {
    memory: {
      usedJSHeapSize: number;
    };
  };
};

const canRunMemoryTests =
  global.performance?.memory?.usedJSHeapSize && global.gc;

export const memorySuite: typeof suite = canRunMemoryTests
  ? suite
  : (suite.skip as typeof suite);
