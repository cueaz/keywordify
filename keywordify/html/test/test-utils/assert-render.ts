/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2021 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert } from 'vitest';
import { render } from '../../src/lit-html.js';
import { stripExpressionComments } from '../test-utils/strip-markers.js';

export const makeAssertRender =
  (getContainer: () => HTMLElement) => (value: unknown, expected: string) => {
    const container = getContainer();
    render(value, container);
    return assert.equal(stripExpressionComments(container.innerHTML), expected);
  };
