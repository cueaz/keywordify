/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: MIT
 */

import * as K from '~keywords';
import * as RK from '~keywords/raw';
import {
  BRAND_SYMBOL,
  type EffectFn,
  type EffectOptions,
  effect,
  type ReadonlySignal,
  signal,
} from '../signal.js';

const isFunction = (v: unknown): v is AnyFunction => typeof v === RK.function;

export type Subscribable = Pick<
  ReadonlySignal<void>,
  typeof K.brand | typeof K.subscribe
>;

/**
 * A lazy-evaluated, multicast-supported side-effect node
 * @param effectFn The side effect to execute
 * @param options DevTools identifier and engine options
 * @returns A segregated Subscribable interface
 */
export function reaction(
  effectFn: EffectFn,
  options?: EffectOptions,
): Subscribable {
  // Backing engine purely to dispatch push notifications
  const tickSignal = signal(0);

  let disposeCoreEffect: (() => void) | null = null;
  let refCount = 0;
  let isExecuting = false; // Mutex lock for Re-entrancy defense
  let isSelfDisposed = false; // Memory leak guard for manual this.dispose()

  const forceTeardown = () => {
    isSelfDisposed = true;
    if (disposeCoreEffect) {
      disposeCoreEffect();
      disposeCoreEffect = null;
    }
  };

  return {
    [K.brand]: BRAND_SYMBOL,

    [K.subscribe](listener: () => void): () => void {
      if (isSelfDisposed) {
        return () => {};
      }

      if (refCount === 0) {
        disposeCoreEffect = effect(function () {
          if (isExecuting || isSelfDisposed) {
            return;
          }

          const self = this as typeof this & { [K._dispose]: () => void };
          const effectContext = Object.create(self);
          effectContext[K._dispose] = () => {
            forceTeardown();
            if (isFunction(self[K._dispose])) {
              self[K._dispose]();
            }
          };

          let cleanup: ReturnType<EffectFn>;
          isExecuting = true; // Lock on

          try {
            cleanup = effectFn.call(effectContext);
            tickSignal[K.value] = tickSignal[K.peek]() + 1;
          } finally {
            isExecuting = false; // Lock off
          }

          return cleanup;
        }, options);
      }

      // Register listener after effect creation to prevent double-firing glitches.
      refCount++;
      const disposeNative = tickSignal[K.subscribe](() => listener());

      let disposed = false;
      return () => {
        if (disposed) {
          return;
        }
        disposed = true;

        disposeNative();
        refCount--;

        if (refCount === 0 && disposeCoreEffect && !isSelfDisposed) {
          disposeCoreEffect();
          disposeCoreEffect = null;
        }
      };
    },
  };
}

/**
 * A Multiplexer (fan-in) that synchronizes the lifecycles of multiple
 * Subscribable nodes into a single, cohesive orchestrator
 * @param lifecycles An array of Subscribable nodes (Reactions or core Signals)
 * @returns A unified Subscribable node
 */
export function mergeLifecycles(
  ...lifecycles: (Subscribable | ReadonlySignal)[]
): Subscribable {
  // Unified heartbeat for all bundled lifecycles
  const tickSignal = signal(0);

  let refCount = 0;
  let teardowns: (() => void)[] = [];

  const onChildNotify = () => {
    tickSignal[K.value] = tickSignal[K.peek]() + 1;
  };

  return {
    [K.brand]: BRAND_SYMBOL,

    [K.subscribe](listener: () => void): () => void {
      if (refCount === 0) {
        const pending: (() => void)[] = [];
        try {
          for (let i = 0; i < lifecycles.length; i++) {
            pending.push(lifecycles[i]![K.subscribe](onChildNotify));
          }
        } catch (err) {
          while (pending.length > 0) {
            pending.pop()?.();
          }
          throw err;
        }
        teardowns = pending;
      }

      refCount++;
      const disposeNative = tickSignal[K.subscribe](() => listener());

      let disposed = false;
      return () => {
        if (disposed) {
          return;
        }
        disposed = true;

        disposeNative();
        refCount--;

        if (refCount === 0) {
          while (teardowns.length > 0) {
            teardowns.pop()?.();
          }
        }
      };
    },
  };
}
