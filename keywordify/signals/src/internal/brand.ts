/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2022-present Preact Team (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: MIT
 */

import * as K from '~keywords';

// An named symbol/brand for detecting Signal instances even when they weren't
// created using the same signals library version.
export const BRAND_SYMBOL = Symbol.for(K.PREACT_SIGNALS);
