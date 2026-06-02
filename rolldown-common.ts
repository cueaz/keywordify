/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: MIT
 */

import type { Plugin, RolldownOptions } from 'rolldown';
import { replacePlugin as replace } from 'rolldown/plugins';
import { dts } from 'rolldown-plugin-dts';
import type { Plugin as VitestPlugin } from 'vitest/config';

export interface CommonPluginsOptions {
  isDev?: boolean;
  dom?: boolean;
}

export const commonPlugins = (
  options?: CommonPluginsOptions,
): (Plugin & VitestPlugin)[] => {
  const { isDev = false } = options ?? {};
  const plugins: Plugin[] = [
    replace(
      { 'import.meta.custom.DEV_MODE': JSON.stringify(isDev) },
      { preventAssignment: true },
    ),
  ];
  return plugins as (Plugin & VitestPlugin)[];
};

export interface CommonConfigOptions {
  input?: RolldownOptions['input'];
  outDir?: string;
  dom?: boolean;
  bundled?: string[];
}

export const commonConfig = (
  options?: CommonConfigOptions,
): RolldownOptions[] => {
  const {
    input = { index: 'src/index.ts' },
    outDir = 'dist',
    dom = false,
    bundled = [],
  } = options ?? {};

  const external = (id: string): boolean => {
    if (id.startsWith('.') || id.startsWith('/')) {
      return false;
    }
    for (const pkg of bundled) {
      if (id === pkg || id.startsWith(`${pkg}/`)) {
        return false;
      }
    }
    return true;
  };

  const configs: RolldownOptions[] = [];

  for (const isDev of [false, true]) {
    const tsPlugins: Plugin[] = [...commonPlugins({ isDev, dom })];
    const dtsPlugins: Plugin[] = [...dts({ emitDtsOnly: true })];
    const outDirPostfixed = `${outDir}${isDev ? '/__dev__' : ''}`;

    configs.push({
      input,
      output: {
        dir: outDirPostfixed,
        format: 'esm',
        sourcemap: isDev,
        minify: 'dce-only',
        comments: {
          annotation: true,
          jsdoc: false,
          legal: false,
        },
      },
      plugins: tsPlugins,
      external,
    });

    if (isDev) {
      configs.push({
        input,
        output: {
          dir: outDirPostfixed,
          format: 'esm',
        },
        plugins: dtsPlugins,
        external,
      });
    }
  }

  return configs;
};
