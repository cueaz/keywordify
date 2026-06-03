/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: MIT
 */

import * as K from '~keywords';
import { BRAND_SYMBOL } from '../internal/brand.js';
import {
  type EffectFn,
  type EffectOptions,
  effect,
  type ReadonlySignal,
  signal,
} from '../signal.js';

/**
 * A strictly segregated subscription interface exposing only brand
 * verification and the subscribe/unsubscribe lifecycle contract.
 * Used as the public surface for both `reaction()` and `fuse()`.
 */
export type Subscribable<T = unknown> = Pick<
  ReadonlySignal<T>,
  typeof K.brand | typeof K.subscribe
>;

/**
 * A lazy-evaluated, multicast-supported side-effect node.
 *
 * The core effect is created on the first `subscribe()` call and disposed
 * when the last listener unsubscribes. Re-subscribing after full teardown
 * re-creates the core effect from scratch.
 *
 * @param effectFn The side effect to execute. May return a cleanup function.
 *   Receives a shadowed `this` context where `this.dispose()` triggers
 *   permanent teardown of the reaction (self-disposal).
 * @param options DevTools identifier and engine options forwarded to the
 *   underlying `effect()` call.
 * @returns A strictly segregated Subscribable interface.
 * @throws Re-throws if `effectFn` throws during the initial execution
 *   triggered by the first subscriber, or if a `listener` throws during
 *   its initial synchronous invocation by `Signal.prototype.subscribe`.
 */
export function reaction(
  effectFn: EffectFn,
  options?: EffectOptions,
): Subscribable<void> {
  // Backing signal purely to dispatch push notifications to listeners.
  // Its value is a monotonic counter; each effectFn run bumps it by 1.
  const tickSignal = signal(0);

  let disposeCoreEffect: (() => void) | null = null;
  let refCount = 0;
  let isExecuting = false; // Mutex lock for re-entrancy defense
  let isSelfDisposed = false; // Permanent teardown flag for this.dispose()

  /**
   * Permanently disables this reaction. Idempotent: safe to call multiple
   * times. Sets `isSelfDisposed` so the core effect's guard clause
   * (`if (isExecuting || isSelfDisposed)`) prevents further execution.
   */
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

          // Context Shadowing: create a prototype-chained object that
          // inherits all of the Effect instance's properties (`this`),
          // but overrides `_dispose` so that `this.dispose()` in user
          // code triggers `forceTeardown()` before delegating to the
          // engine's original `Effect.prototype._dispose`.
          //
          // Chain: effectContext[K._dispose] (override)
          //   -> forceTeardown()
          //   -> self[K._dispose]() (original Effect._dispose)
          //
          // User calls `this[K.dispose]()` (public key) ->
          //   Effect.prototype[K.dispose] -> `this[K._dispose]()` ->
          //   hits the override on effectContext.
          const self = this as typeof this & { [K._dispose]: () => void };
          const effectContext = Object.create(self);
          effectContext[K._dispose] = () => {
            forceTeardown();
            if (typeof self[K._dispose] === 'function') {
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

      // Register listener AFTER effect creation to prevent double-firing:
      // the effect bumps tickSignal during its first run, and if the
      // listener were already subscribed, it would fire for that bump
      // AND again from tickSignal.subscribe's initial invocation.
      refCount++;
      let disposeNative: () => void;
      try {
        disposeNative = tickSignal[K.subscribe](() => listener());
      } catch (err) {
        // Rollback: listener threw during its initial synchronous
        // invocation inside Signal.prototype.subscribe. The internal
        // subscribe-effect is auto-disposed by the engine, but refCount
        // was already incremented. Undo it — and tear down the core
        // effect if this was the sole subscriber.
        refCount--;
        if (refCount === 0 && disposeCoreEffect && !isSelfDisposed) {
          disposeCoreEffect();
          disposeCoreEffect = null;
        }
        throw err;
      }

      // Idempotent unsubscribe: prevents refCount from going negative
      // if the caller invokes the returned dispose function more than once.
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
 * Subscribable nodes into a single, cohesive orchestrator.
 *
 * All children are subscribed on the first `subscribe()` call and torn
 * down when the last listener unsubscribes. If a child's subscribe
 * throws, all previously subscribed children are rolled back before
 * the error is re-thrown.
 *
 * @param lifecycles Subscribable nodes (reactions or core signals)
 *   to multiplex.
 * @returns A unified Subscribable node whose listeners are notified
 *   whenever any child fires.
 * @throws Re-throws if any child's `subscribe()` throws (with rollback
 *   of earlier children), or if a `listener` throws during its initial
 *   synchronous invocation.
 */
export function fuse(...lifecycles: Subscribable[]): Subscribable<void> {
  // Unified heartbeat: bumped by any child notification.
  const tickSignal = signal(0);

  let refCount = 0;
  let teardowns: (() => void)[] = [];

  // Shared callback subscribed to each child; bumps the heartbeat.
  const onChildNotify = () => {
    tickSignal[K.value] = tickSignal[K.peek]() + 1;
  };

  return {
    [K.brand]: BRAND_SYMBOL,

    [K.subscribe](listener: () => void): () => void {
      if (refCount === 0) {
        // Subscribe to all children with rollback on partial failure:
        // if child N throws, children 0..(N-1) are unsubscribed.
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
      let disposeNative: () => void;
      try {
        disposeNative = tickSignal[K.subscribe](() => listener());
      } catch (err) {
        // Rollback: listener threw during initial invocation.
        refCount--;
        if (refCount === 0) {
          while (teardowns.length > 0) {
            teardowns.pop()?.();
          }
        }
        throw err;
      }

      // Idempotent unsubscribe: prevents refCount corruption on double-dispose.
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
