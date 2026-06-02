/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2017 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert, beforeEach, suite, test } from 'vitest';
import * as K from '~keywords';
import { AsyncDirective, directive } from '../../src/async-directive.js';
import { cache } from '../../src/directives/cache.js';
import {
  type CompiledTemplate,
  html,
  nothing,
  render,
} from '../../src/lit-html.js';

// For compiled template tests
import { _$LH } from '../../src/private-ssr-support.js';
import { stripExpressionComments } from '../test-utils/strip-markers.js';

const branding_tag = (s: TemplateStringsArray) => s;

suite('cache directive', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('caches templates', () => {
    const renderCached = (condition: boolean, v: string) =>
      render(
        html`${cache(
          condition ? html`<div v=${v}></div>` : html`<span v=${v}></span>`,
        )}`,
        container,
      );

    renderCached(true, 'A');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="A"></div>',
    );
    const element1 = container.firstElementChild;

    renderCached(false, 'B');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<span v="B"></span>',
    );
    const element2 = container.firstElementChild;

    assert.notStrictEqual(element1, element2);

    renderCached(true, 'C');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="C"></div>',
    );
    assert.strictEqual(container.firstElementChild, element1);

    renderCached(false, 'D');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<span v="D"></span>',
    );
    assert.strictEqual(container.firstElementChild, element2);
  });

  test('caches compiled templates', () => {
    const _$lit_template_1: CompiledTemplate = {
      [K.h]: branding_tag`<div></div>`,
      [K.parts]: [
        {
          [K.type]: 1,
          [K.index]: 0,
          [K.name]: 'v',
          [K.strings]: ['', ''],
          [K.ctor]: _$LH[K.AttributePart],
        },
      ],
    };
    const _$lit_template_2: CompiledTemplate = {
      [K.h]: branding_tag`<span></span>`,
      [K.parts]: [
        {
          [K.type]: 1,
          [K.index]: 0,
          [K.name]: 'v',
          [K.strings]: ['', ''],
          [K.ctor]: _$LH[K.AttributePart],
        },
      ],
    };
    const renderCached = (condition: boolean, v: string) =>
      render(
        html`${cache(
          condition
            ? {
                [K._$litType$]: _$lit_template_1,
                [K.values]: [v],
              }
            : {
                [K._$litType$]: _$lit_template_2,
                [K.values]: [v],
              },
        )}`,
        container,
      );

    renderCached(true, 'A');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="A"></div>',
    );
    const element1 = container.firstElementChild;

    renderCached(false, 'B');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<span v="B"></span>',
    );
    const element2 = container.firstElementChild;

    assert.notStrictEqual(element1, element2);

    renderCached(true, 'C');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="C"></div>',
    );
    assert.strictEqual(container.firstElementChild, element1);

    renderCached(false, 'D');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<span v="D"></span>',
    );
    assert.strictEqual(container.firstElementChild, element2);
  });

  test('renders non-TemplateResults', () => {
    render(html`${cache('abc')}`, container);
    assert.equal(stripExpressionComments(container.innerHTML), 'abc');
  });

  test('caches templates when switching against non-TemplateResults', () => {
    const renderCached = (condition: boolean, v: string) =>
      render(
        html`${cache(condition ? html`<div v=${v}></div>` : v)}`,
        container,
      );

    renderCached(true, 'A');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="A"></div>',
    );
    const element1 = container.firstElementChild;

    renderCached(false, 'B');
    assert.equal(stripExpressionComments(container.innerHTML), 'B');

    renderCached(true, 'C');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="C"></div>',
    );
    assert.strictEqual(container.firstElementChild, element1);

    renderCached(false, 'D');
    assert.equal(stripExpressionComments(container.innerHTML), 'D');
  });

  test('caches templates when switching against TemplateResult and undefined values', () => {
    const renderCached = (v: unknown) =>
      render(html`<div>${cache(v)}</div>`, container);

    renderCached(html`A`);
    assert.equal(stripExpressionComments(container.innerHTML), '<div>A</div>');

    renderCached(undefined);
    assert.equal(stripExpressionComments(container.innerHTML), '<div></div>');

    renderCached(html`B`);
    assert.equal(stripExpressionComments(container.innerHTML), '<div>B</div>');
  });

  test('cache can be dynamic', () => {
    const renderMaybeCached = (condition: boolean, v: string) =>
      render(
        html`${condition ? cache(html`<div v=${v}></div>`) : v}`,
        container,
      );

    renderMaybeCached(true, 'A');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="A"></div>',
    );

    renderMaybeCached(false, 'B');
    assert.equal(stripExpressionComments(container.innerHTML), 'B');

    renderMaybeCached(true, 'C');
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div v="C"></div>',
    );

    renderMaybeCached(false, 'D');
    assert.equal(stripExpressionComments(container.innerHTML), 'D');
  });

  test('cache can switch between TemplateResult and non-TemplateResult', () => {
    const renderCache = (bool: boolean) =>
      render(html`${cache(bool ? html`<p></p>` : nothing)}`, container);

    renderCache(true);
    assert.equal(stripExpressionComments(container.innerHTML), '<p></p>');
    renderCache(false);
    assert.equal(stripExpressionComments(container.innerHTML), '');
    renderCache(true);
    assert.equal(stripExpressionComments(container.innerHTML), '<p></p>');
    renderCache(true);
    assert.equal(stripExpressionComments(container.innerHTML), '<p></p>');
    renderCache(false);
    assert.equal(stripExpressionComments(container.innerHTML), '');
    renderCache(true);
    assert.equal(stripExpressionComments(container.innerHTML), '<p></p>');
    renderCache(false);
    assert.equal(stripExpressionComments(container.innerHTML), '');
    renderCache(false);
    assert.equal(stripExpressionComments(container.innerHTML), '');
  });

  test('async directives disconnect/reconnect when moved in/out of cache', () => {
    const disconnectable = directive(
      class extends AsyncDirective {
        log: string[] | undefined;
        id: string | undefined;
        [K.render](log: string[], id: string) {
          this.log = log;
          this.id = id;
          this.log.push(`render-${this.id}`);
          return id;
        }
        override [K.disconnected]() {
          this.log!.push(`disconnected-${this.id}`);
        }
        override [K.reconnected]() {
          this.log!.push(`reconnected-${this.id}`);
        }
      },
    );
    const renderCached = (log: string[], condition: boolean) =>
      render(
        html`<div>${cache(
          condition
            ? html`<div>${disconnectable(log, 'a')}</div>`
            : html`<span>${disconnectable(log, 'b')}</span>`,
        )}</div>`,
        container,
      );
    const log: string[] = [];

    renderCached(log, true);
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div><div>a</div></div>',
    );
    assert.deepEqual(log, ['render-a']);

    log.length = 0;
    renderCached(log, false);
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div><span>b</span></div>',
    );
    assert.deepEqual(log, ['disconnected-a', 'render-b']);

    log.length = 0;
    renderCached(log, true);
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div><div>a</div></div>',
    );
    assert.deepEqual(log, ['disconnected-b', 'reconnected-a', 'render-a']);

    log.length = 0;
    renderCached(log, false);
    assert.equal(
      stripExpressionComments(container.innerHTML),
      '<div><span>b</span></div>',
    );
    assert.deepEqual(log, ['disconnected-a', 'reconnected-b', 'render-b']);
  });
});
