/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: MIT
 */

import { playwright } from '@vitest/browser-playwright';
import keywords from 'unplugin-keywords/rolldown';
import type { TestProjectConfiguration, ViteUserConfig } from 'vitest/config';
import { commonPlugins } from './rolldown-common.js';

export interface CommonConfigOptions {
  dom?: boolean;
}

export const commonConfig = (options?: CommonConfigOptions): ViteUserConfig => {
  const { dom = false } = options ?? {};

  const projects: TestProjectConfiguration[] = [];
  for (const isDev of [false, true]) {
    projects.push({
      resolve: {
        conditions: [isDev ? 'development' : 'production'],
      },
      plugins: [
        ...commonPlugins({ isDev, dom }),
        keywords({
          secret: 'only-for-testing',
          isDev,
        }),
      ],
      test: {
        execArgv: ['--expose-gc'],
        ...(dom && {
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: { args: ['--js-flags=--expose-gc'] },
            }),
            instances: [{ browser: 'chromium' }],
            headless: true,
            screenshotFailures: false,
          },
        }),
        projects,
      },
    });
  }

  return {
    test: {
      projects,
    },
  };
};
