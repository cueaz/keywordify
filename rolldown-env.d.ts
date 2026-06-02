/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: MIT
 */

interface ImportMetaCustom {
  readonly DEV_MODE: boolean;
}

interface ImportMeta {
  readonly custom: ImportMetaCustom;
}

// biome-ignore lint/suspicious/noExplicitAny: for type predicates
type AnyFunction = (...args: any[]) => unknown;
