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
import { asyncReplace } from '../../src/directives/async-replace.js';
import { html, nothing, render } from '../../src/lit-html.js';
import { global, memorySuite } from '../test-utils/memory.js';
import { stripExpressionMarkers } from '../test-utils/strip-markers.js';
import { TestAsyncIterable } from './test-async-iterable.js';

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));

suite('asyncReplace', () => {
  let container: HTMLDivElement;
  let iterable: TestAsyncIterable<unknown>;

  beforeEach(() => {
    container = document.createElement('div');
    iterable = new TestAsyncIterable<unknown>();
  });

  test('replaces content as the async iterable yields new values (ChildPart)', async () => {
    render(html`<div>${asyncReplace(iterable)}</div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    await iterable.push('bar');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>bar</div>');
  });

  test('replaces content as the async iterable yields new values (AttributePart)', async () => {
    render(html`<div class="${asyncReplace(iterable)}"></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="foo"></div>',
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="bar"></div>',
    );
  });

  test('replaces content as the async iterable yields new values (PropertyPart)', async () => {
    render(html`<div .className=${asyncReplace(iterable)}></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="foo"></div>',
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div class="bar"></div>',
    );
  });

  test('replaces content as the async iterable yields new values (BooleanAttributePart)', async () => {
    render(html`<div ?hidden=${asyncReplace(iterable)}></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push(true);
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div hidden=""></div>',
    );

    await iterable.push(false);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
  });

  test('replaces content as the async iterable yields new values (EventPart)', async () => {
    render(html`<div @click=${asyncReplace(iterable)}></div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    let value: unknown;
    await iterable.push(() => (value = 1));
    (container.firstElementChild as HTMLDivElement)!.click();
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal(value, 1);

    await iterable.push(() => (value = 2));
    (container.firstElementChild as HTMLDivElement)!.click();
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
    assert.equal(value, 2);
  });

  test('clears the Part when a value is undefined', async () => {
    render(html`<div>${asyncReplace(iterable)}</div>`, container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    await iterable.push(undefined as unknown as string);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');
  });

  test('uses the mapper function', async () => {
    render(
      html`<div>${asyncReplace(iterable, (v, i) => html`${i}: ${v} `)}</div>`,
      container,
    );
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>0: foo </div>',
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>1: bar </div>',
    );
  });

  test('renders new iterable over a pending iterable', async () => {
    const t = (iterable: AsyncIterable<unknown>) =>
      html`<div>${asyncReplace(iterable)}</div>`;
    render(t(iterable), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    const iterable2 = new TestAsyncIterable<string>();
    render(t(iterable2), container);

    // The last value is preserved until we receive the first
    // value from the new iterable
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    await iterable2.push('hello');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );
  });

  test('renders the same iterable even when the iterable new value is emitted at the same time as a re-render', async () => {
    const t = (iterable: AsyncIterable<unknown>) =>
      html`<div>${asyncReplace(iterable)}</div>`;
    let wait: Promise<void>;
    render(t(iterable), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    wait = iterable.push('hello');
    render(t(iterable), container);
    await wait;
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );

    wait = iterable.push('bar');
    render(t(iterable), container);
    await wait;
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>bar</div>');
  });

  test('renders the same iterable value when re-rendered with no new value emitted', async () => {
    const t = (iterable: AsyncIterable<unknown>) =>
      html`<div>${asyncReplace(iterable)}</div>`;
    render(t(iterable), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('hello');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );

    render(t(iterable), container);
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );

    render(t(iterable), container);
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );
  });

  test('renders new value over a pending iterable', async () => {
    const t = (v: unknown) => html`<div>${v}</div>`;
    // This is a little bit of an odd usage of directives as values, but it
    // is possible, and we check here that asyncReplace plays nice in this case
    render(t(asyncReplace(iterable)), container);
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div></div>');

    await iterable.push('foo');
    assert.equal(stripExpressionMarkers(container.innerHTML), '<div>foo</div>');

    render(t('hello'), container);
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );

    await iterable.push('bar');
    assert.equal(
      stripExpressionMarkers(container.innerHTML),
      '<div>hello</div>',
    );
  });

  test('does not render the first value if it is replaced first', async () => {
    async function* generator(delay: Promise<unknown>, value: unknown) {
      await delay;
      yield value;
    }

    const component = (value: AsyncIterable<unknown>) =>
      html`<p>${asyncReplace(value)}</p>`;
    const delay = (delay: number) =>
      new Promise((res) => setTimeout(res, delay));

    const slowDelay = delay(20);
    const fastDelay = delay(10);

    render(component(generator(slowDelay, 'slow')), container);
    render(component(generator(fastDelay, 'fast')), container);

    await slowDelay;
    await delay(10);

    assert.equal(stripExpressionMarkers(container.innerHTML), '<p>fast</p>');
  });

  suite('disconnection', () => {
    test('does not render when iterable resolves while disconnected', async () => {
      const component = (value: AsyncIterable<unknown>) =>
        html`<p>${asyncReplace(value)}</p>`;
      const part = render(component(iterable), container);
      await iterable.push('1');
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
      part[K.setConnected](false);
      await iterable.push('2');
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
      part[K.setConnected](true);
      await nextFrame();
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>2</p>');
      await iterable.push('3');
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>3</p>');
    });

    test('disconnection thrashing', async () => {
      const component = (value: AsyncIterable<unknown>) =>
        html`<p>${asyncReplace(value)}</p>`;
      const part = render(component(iterable), container);
      await iterable.push('1');
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
      part[K.setConnected](false);
      await iterable.push('2');
      part[K.setConnected](true);
      part[K.setConnected](false);
      await nextFrame();
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
      part[K.setConnected](true);
      await nextFrame();
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>2</p>');
      await iterable.push('3');
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>3</p>');
    });

    test('does not render when newly rendered while disconnected', async () => {
      const component = (value: unknown) => html`<p>${value}</p>`;
      const part = render(component('static'), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>static</p>',
      );
      part[K.setConnected](false);
      render(component(asyncReplace(iterable)), container);
      await iterable.push('1');
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>static</p>',
      );
      part[K.setConnected](true);
      await nextFrame();
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>1</p>');
      await iterable.push('2');
      assert.equal(stripExpressionMarkers(container.innerHTML), '<p>2</p>');
    });

    test('does not render when resolved and changed while disconnected', async () => {
      const component = (value: unknown) => html`<p>${value}</p>`;
      const part = render(component('staticA'), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>staticA</p>',
      );
      part[K.setConnected](false);
      render(component(asyncReplace(iterable)), container);
      await iterable.push('1');
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>staticA</p>',
      );
      render(component('staticB'), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>staticB</p>',
      );
      part[K.setConnected](true);
      await nextFrame();
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>staticB</p>',
      );
      await iterable.push('2');
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>staticB</p>',
      );
    });

    test('the same promise can be rendered into two asyncReplace instances', async () => {
      const component = (iterable: AsyncIterable<unknown>) =>
        html`<p>${asyncReplace(iterable)}</p><p>${asyncReplace(iterable)}</p>`;
      render(component(iterable), container);
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p></p><p></p>',
      );
      await iterable.push('1');
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>1</p><p>1</p>',
      );
      await iterable.push('2');
      assert.equal(
        stripExpressionMarkers(container.innerHTML),
        '<p>2</p><p>2</p>',
      );
    });
  });

  memorySuite('memory leak tests', () => {
    test('tree with asyncReplace cleared while iterables are pending', async () => {
      const template = (v: unknown) => html`<div>${v}</div>`;
      // Make a big array set on an expando to exaggerate any leaked DOM
      const big = () => new Array(10000).fill(0);
      // Hold onto the iterables to prevent them from being gc'ed
      const iterables: Array<TestAsyncIterable<string>> = [];
      global.gc();
      const heap = global.performance.memory.usedJSHeapSize;
      for (let i = 0; i < 1000; i++) {
        // Iterable passed to asyncReplace that will never yield
        const iterable = new TestAsyncIterable<string>();
        iterables.push(iterable);
        // Render the directive into a `<span>` with a 10kb expando, to exaggerate
        // when DOM is not being gc'ed
        render(
          template(html`<span .p=${big()}>${asyncReplace(iterable)}</span>`),
          container,
        );
        // Clear the `<span>` + directive
        render(template(nothing), container);
        // Periodically force a GC to prevent the heap size from expanding
        // too much.
        // If we're leaking memory this is a noop. But if we aren't, this makes
        // it easier for the browser's GC to keep the heap size similar to the
        // actual amount of memory we're using.
        if (i % 30 === 0) {
          global.gc();
        }
      }
      global.gc();
      assert.isAtMost(
        global.performance.memory.usedJSHeapSize / heap - 1,
        // Allow a 30% margin of heap growth; due to the 10kb expando, an actual
        // DOM leak is orders of magnitude larger.
        0.3,
        'memory leak detected',
      );
    });
  });
});
