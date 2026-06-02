/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2022 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/// <reference types="@types/node/assert/strict.d.ts" />

// This file will be loaded by Node from the node:test script to verify that all
// exports of this package can be imported without crashing in Node.

import '../src/async-directive.js';
import '../src/directive-helpers.js';
import '../src/directive.js';
import '../src/directives/async-append.js';
import '../src/directives/async-replace.js';
import '../src/directives/cache.js';
import '../src/directives/choose.js';
import '../src/directives/class-map.js';
import '../src/directives/guard.js';
import '../src/directives/if-defined.js';
import '../src/directives/join.js';
import '../src/directives/keyed.js';
import '../src/directives/live.js';
import '../src/directives/map.js';
import '../src/directives/range.js';
import '../src/directives/ref.js';
import '../src/directives/repeat.js';
import '../src/directives/style-map.js';
import '../src/directives/template-content.js';
import '../src/directives/unsafe-html.js';
import '../src/directives/unsafe-svg.js';
import '../src/directives/until.js';
import '../src/directives/when.js';
import '../src/index.js';
import '../src/lit-html.js';
import '../src/private-ssr-support.js';
import '../src/signals/html-tag.js';
import '../src/signals/watch.js';
import '../src/static.js';

import assert from 'node:assert/strict';
import { isServer } from '../src/is-server.js';

assert.strictEqual(isServer, true, 'Expected isServer to be true');
