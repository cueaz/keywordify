/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2022 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Strips Keywordify expression comments from provided html string.
 */
export const stripExpressionComments = (html: string) =>
  html.replace(/<!---->/g, '');

/**
 * Strips Keywordify expression markers from provided html string.
 */
export const stripExpressionMarkers = (html: string) =>
  html.replace(/<!---->/g, '');

/**
 * Resolves browser fallback element behaviors during testing of malformed dynamic
 * tag templates by stripping the temporary fallback tags back to pure empty tags.
 */
export const stripDynamicFallbackTags = (html: string) =>
  html.replace(/z\ue001[\u28f1-\u28ff]{30}\ue001/g, '');
