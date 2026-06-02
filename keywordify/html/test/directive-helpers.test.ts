/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2020 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { assert, beforeEach, suite, test } from 'vitest';
import * as K from '~keywords';
import {
  AsyncDirective,
  Directive,
  directive,
} from '../src/async-directive.js';
import {
  getDirectiveClass,
  insertPart,
  isCompiledTemplateResult,
  isDirectiveResult,
  isPrimitive,
  isTemplateResult,
  removePart,
  setChildPartValue,
  TemplateResultType,
} from '../src/directive-helpers.js';
import { classMap } from '../src/directives/class-map.js';
import {
  type ChildPart,
  type CompiledTemplate,
  type CompiledTemplateResult,
  html,
  mathml,
  render,
  svg,
  type TemplateResult,
  type UncompiledTemplateResult,
} from '../src/lit-html.js';
import { stripExpressionComments } from './test-utils/strip-markers.js';

const branding_tag = (s: TemplateStringsArray) => s;
const _$lit_template_1: CompiledTemplate = {
  [K.h]: branding_tag``,
  [K.parts]: [],
};

/**
 * Use to check if the file has been compiled with @lit-labs/compiler.
 */
const isTestFileNotCompiled = html``[K._$litType$] === 1;

suite('directive-helpers', () => {
  let container: HTMLDivElement;

  const assertContent = (html: string, root = container) => {
    return assert.equal(stripExpressionComments(root.innerHTML), html);
  };

  beforeEach(() => {
    container = document.createElement('div');
  });

  test('isPrimitive', () => {
    assert.isTrue(isPrimitive(null));
    assert.isTrue(isPrimitive(undefined));
    assert.isTrue(isPrimitive(true));
    assert.isTrue(isPrimitive(1));
    assert.isTrue(isPrimitive('a'));
    assert.isTrue(isPrimitive(Symbol()));

    // Can't polyfill this syntax:
    // assert.isTrue(isPrimitive(1n));

    assert.isFalse(isPrimitive({}));
    assert.isFalse(isPrimitive(() => {}));
  });

  test('isTemplateResult', () => {
    assert.isTrue(isTemplateResult(html``));
    assert.isTrue(isTemplateResult(svg``));
    assert.isTrue(isTemplateResult(mathml``));
    if (isTestFileNotCompiled) {
      assert.isTrue(isTemplateResult(html``, TemplateResultType[K.HTML]));
    } else {
      // This template was compiled, so `isTemplateResult` with an explicit
      // check for `TemplateResultType.HTML` returns false.
      assert.isFalse(isTemplateResult(html``, TemplateResultType[K.HTML]));
    }
    assert.isTrue(isTemplateResult(svg``, TemplateResultType[K.SVG]));
    assert.isTrue(isTemplateResult(mathml``, TemplateResultType[K.MATHML]));

    assert.isFalse(isTemplateResult(null));
    assert.isFalse(isTemplateResult(undefined));
    assert.isFalse(isTemplateResult({}));
    assert.isFalse(isTemplateResult(html``, TemplateResultType[K.SVG]));
    assert.isFalse(isTemplateResult(html``, TemplateResultType[K.MATHML]));
    assert.isFalse(isTemplateResult(svg``, TemplateResultType[K.HTML]));
    assert.isFalse(isTemplateResult(svg``, TemplateResultType[K.MATHML]));
    assert.isFalse(isTemplateResult(null, TemplateResultType[K.HTML]));
    assert.isFalse(isTemplateResult(undefined, TemplateResultType[K.HTML]));
    assert.isFalse(isTemplateResult({}, TemplateResultType[K.HTML]));

    assert.isTrue(
      isTemplateResult({
        [K._$litType$]: _$lit_template_1,
        [K.values]: [],
      }),
    );
    assert.isFalse(
      isTemplateResult(
        {
          [K._$litType$]: _$lit_template_1,
          [K.values]: [],
        },
        TemplateResultType[K.HTML],
      ),
    );
    assert.isFalse(
      isTemplateResult(
        {
          [K._$litType$]: _$lit_template_1,
          [K.values]: [],
        },
        TemplateResultType[K.SVG],
      ),
    );
  });

  test('isTemplateResult type only test', () => {
    // This test has no runtime checks, and fails at build time if there are
    // type issues.
    function acceptUncompiledTemplateResult(_v: UncompiledTemplateResult) {}

    function acceptTemplateOrCompiledTemplateResult(
      _v: TemplateResult | CompiledTemplateResult,
    ) {}
    function acceptTemplateResultHtml(
      _v: TemplateResult<(typeof TemplateResultType)[typeof K.HTML]>,
    ) {}
    function acceptTemplateResultSvg(
      _v: TemplateResult<(typeof TemplateResultType)[typeof K.SVG]>,
    ) {}
    function acceptTemplateResultMathMl(
      _v: TemplateResult<(typeof TemplateResultType)[typeof K.MATHML]>,
    ) {}

    const v = html`` as TemplateResult | CompiledTemplateResult;
    if (isTemplateResult(v)) {
      acceptTemplateOrCompiledTemplateResult(v);

      // @ts-expect-error v could be a CompiledTemplateResult
      acceptUncompiledTemplateResult(v);
    }
    if (isTemplateResult(v, TemplateResultType[K.HTML])) {
      acceptUncompiledTemplateResult(v);
      acceptTemplateResultHtml(v);
      // @ts-expect-error v is an html template result
      acceptTemplateResultSvg(v);
      // @ts-expect-error v is an html template result
      acceptTemplateResultMathMl(v);
    }
    if (isTemplateResult(v, TemplateResultType[K.SVG])) {
      acceptUncompiledTemplateResult(v);
      acceptTemplateResultSvg(v);
      // @ts-expect-error v is an svg template result
      acceptTemplateResultHtml(v);
      // @ts-expect-error v is an svg template result
      acceptTemplateResultMathMl(v);
    }
    if (isTemplateResult(v, TemplateResultType[K.MATHML])) {
      acceptUncompiledTemplateResult(v);
      acceptTemplateResultMathMl(v);
      // @ts-expect-error v is a MathML template result
      acceptTemplateResultSvg(v);
      // @ts-expect-error v is a MathML template result
      acceptTemplateResultHtml(v);
    }
  });

  test('isCompiledTemplateResult', () => {
    assert.isTrue(
      isCompiledTemplateResult({
        [K._$litType$]: _$lit_template_1,
        [K.values]: [],
      }),
    );

    if (isTestFileNotCompiled) {
      assert.isFalse(isCompiledTemplateResult(html``));
    }
    assert.isFalse(isCompiledTemplateResult(svg``));
    assert.isFalse(isCompiledTemplateResult(null));
    assert.isFalse(isCompiledTemplateResult(undefined));
    assert.isFalse(isCompiledTemplateResult({}));
  });

  test('isDirectiveResult', () => {
    assert.isTrue(isDirectiveResult(classMap({})));

    assert.isFalse(isDirectiveResult(null));
    assert.isFalse(isDirectiveResult(undefined));
    assert.isFalse(isDirectiveResult({}));
  });

  test('getDirectiveClass', () => {
    interface Constructor<T> {
      new (...args: unknown[]): T;
    }
    assert.instanceOf(
      getDirectiveClass(classMap({}))?.prototype,
      Directive as Constructor<Directive>,
    );
    assert.equal(getDirectiveClass(null), undefined);
    assert.equal(getDirectiveClass(undefined), undefined);
    assert.equal(getDirectiveClass({}), undefined);
  });

  test('insertPart', () => {
    class TestDirective extends Directive {
      [K.render](v: unknown) {
        return v;
      }

      override [K.update](
        part: ChildPart,
        [v]: Parameters<this[typeof K.render]>,
      ) {
        // Create two parts and remove the first, then the second to make sure
        // that removing the first doesn't move the second's markers. This
        // fails if the parts accidentally share a marker.
        const childPart2 = insertPart(part);
        const childPart1 = insertPart(part, childPart2);

        // Check that the test is correctly inserting two different parts:
        assert.notEqual(childPart1, childPart2);

        removePart(childPart1);
        removePart(childPart2);

        return v;
      }
    }
    const testDirective = directive(TestDirective);

    const go = (v: unknown) =>
      render(html`<div>${testDirective(v)}</div>`, container);

    go('A');
    assertContent('<div>A</div>');
  });

  test('removePart removes the start marker', () => {
    let testPart: ChildPart | undefined;
    const testDirective = directive(
      class TestDirective extends Directive {
        [K.render](v: unknown) {
          return v;
        }

        override [K.update](
          part: ChildPart,
          [v]: Parameters<this[typeof K.render]>,
        ) {
          testPart = part;
          return v;
        }
      },
    );

    const go = (v: unknown) =>
      render(html`<div>${testDirective(v)}</div>`, container);

    go('A');
    assertContent('<div>A</div>');
    removePart(testPart!);
    assertContent('<div></div>');
    assert.strictEqual(container.firstElementChild?.childNodes.length, 0);
  });

  test('insertPart keeps connection state in sync', () => {
    // Directive that tracks/renders connected state
    let connected = false;
    const aDirective = directive(
      class extends AsyncDirective {
        [K.render]() {
          connected = this[K.isConnected];
          return this[K.isConnected];
        }
        override [K.disconnected]() {
          connected = false;
          assert.equal(connected, this[K.isConnected]);
          this[K.setValue](connected);
        }
        override [K.reconnected]() {
          connected = true;
          assert.equal(connected, this[K.isConnected]);
          this[K.setValue](connected);
        }
      },
    );

    const container1 = container.appendChild(document.createElement('div'));
    const container2 = container.appendChild(document.createElement('div'));

    // Create disconnected root part
    const rootPart1 = render('rootPart1:', container1);
    rootPart1[K.setConnected](false);

    // Create connected root part
    const rootPart2 = render('rootPart2:', container2);

    // Insert child part into disconnected root part
    const movingPart = insertPart(rootPart1);
    const template = (v: unknown) => html`<p>${v}</p>`;
    setChildPartValue(movingPart, template(aDirective()));

    // Verify child part is not connected
    assertContent('rootPart1:<p>false</p>', container1);
    assertContent('rootPart2:', container2);
    assert.isFalse(connected);

    // Move child part into connected root part
    insertPart(rootPart2, undefined, movingPart);

    // Verify child part is connected
    assertContent('rootPart1:', container1);
    assertContent('rootPart2:<p>true</p>', container2);
    assert.isTrue(connected);

    // Flip connection state of parts
    rootPart1[K.setConnected](true);
    rootPart2[K.setConnected](false);

    // Verify child part is not connected
    assertContent('rootPart1:', container1);
    assertContent('rootPart2:<p>false</p>', container2);
    assert.isFalse(connected);

    // Move child part into connected root part
    insertPart(rootPart1, undefined, movingPart);

    // Verify child part is connected
    assertContent('rootPart1:<p>true</p>', container1);
    assertContent('rootPart2:', container2);
    assert.isTrue(connected);
  });
});
