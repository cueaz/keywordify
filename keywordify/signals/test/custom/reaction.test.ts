/**
 * @license
 * Copyright 2026-present cueaz
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it, vi } from 'vitest';
import * as K from '~keywords';
import { fuse, reaction } from '../../src/custom/reaction.js';
import {
  BRAND_SYMBOL,
  batch,
  computed,
  effect,
  signal,
} from '../../src/signal.js';

describe('reaction()', () => {
  //#region Interface & Brand

  it('should return a Subscribable with the correct brand', () => {
    const r = reaction(() => {});
    expect(r[K.brand]).to.equal(BRAND_SYMBOL);
  });

  it('should expose only brand and subscribe on the returned object', () => {
    const r = reaction(() => {});
    const keys = Reflect.ownKeys(r);
    expect(keys).to.have.lengthOf(2);
  });

  //#endregion Interface & Brand

  //#region Laziness

  it('should NOT execute effectFn until subscribed', () => {
    const spy = vi.fn();
    reaction(spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should execute effectFn on first subscribe', () => {
    const spy = vi.fn();
    const r = reaction(spy);
    r[K.subscribe](() => {});
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Laziness

  //#region Basic Notifications

  it('should notify listener when a dependency changes', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should track multiple signal dependencies', () => {
    const a = signal(0);
    const b = signal(0);
    const r = reaction(() => {
      a[K.value];
      b[K.value];
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    a[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
    spy.mockClear();

    b[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should track computed signal dependencies', () => {
    const s = signal(0);
    const c = computed(() => s[K.value] * 2);
    const r = reaction(() => {
      c[K.value];
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 5;
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should not notify listener if dependency value is set to the same value', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 0;
    expect(spy).not.toHaveBeenCalled();
  });

  it('should batch signal writes within the reaction effectFn', () => {
    const a = signal(0);
    const b = signal(0);
    const r = reaction(() => {
      a[K.value];
      b[K.value];
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    batch(() => {
      a[K.value] = 1;
      b[K.value] = 1;
    });

    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Basic Notifications

  //#region Multicast (Multiple Listeners)

  it('should support multiple listeners', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const spy1 = vi.fn();
    const spy2 = vi.fn();
    r[K.subscribe](spy1);
    r[K.subscribe](spy2);
    spy1.mockClear();
    spy2.mockClear();

    s[K.value] = 1;
    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).toHaveBeenCalledOnce();
  });

  it('should only create one core effect for multiple listeners', () => {
    let effectRunCount = 0;
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
      effectRunCount++;
    });

    r[K.subscribe](() => {});
    expect(effectRunCount).to.equal(1);

    r[K.subscribe](() => {});
    // Should NOT re-run effect for second subscriber
    expect(effectRunCount).to.equal(1);
  });

  it('should continue notifying remaining listeners after one disposes', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const spy3 = vi.fn();
    r[K.subscribe](spy1);
    const dispose2 = r[K.subscribe](spy2);
    r[K.subscribe](spy3);
    spy1.mockClear();
    spy2.mockClear();
    spy3.mockClear();

    dispose2();
    s[K.value] = 1;

    expect(spy1).toHaveBeenCalledOnce();
    expect(spy2).not.toHaveBeenCalled();
    expect(spy3).toHaveBeenCalledOnce();
  });

  //#endregion Multicast

  //#region Ref-Counting & Lifecycle

  it('should dispose the core effect when last listener unsubscribes', () => {
    const s = signal(0);
    let effectRunCount = 0;
    const r = reaction(() => {
      s[K.value];
      effectRunCount++;
    });

    const dispose1 = r[K.subscribe](() => {});
    const dispose2 = r[K.subscribe](() => {});
    effectRunCount = 0;

    dispose1();
    // Core effect should still be alive (one listener remaining)
    s[K.value] = 1;
    expect(effectRunCount).to.equal(1);

    effectRunCount = 0;
    dispose2();
    // Core effect should now be disposed
    s[K.value] = 2;
    expect(effectRunCount).to.equal(0);
  });

  it('should re-activate core effect on re-subscribe after full teardown', () => {
    const s = signal(0);
    let effectRunCount = 0;
    const r = reaction(() => {
      s[K.value];
      effectRunCount++;
    });

    const dispose1 = r[K.subscribe](() => {});
    expect(effectRunCount).to.equal(1);
    dispose1();

    effectRunCount = 0;
    const spy = vi.fn();
    r[K.subscribe](spy);
    expect(effectRunCount).to.equal(1);

    spy.mockClear();
    s[K.value] = 99;
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should not double-fire listener on initial subscribe', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const spy = vi.fn();
    r[K.subscribe](spy);

    // The listener subscribes to tickSignal AFTER the effect runs,
    // so it should receive exactly one initial notification from tickSignal.subscribe
    // (which is the initial value notification from the underlying signal subscribe)
    // but NOT a second from the effect bumping the tick.
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Ref-Counting & Lifecycle

  //#region Cleanup Function

  it('should forward cleanup function returned from effectFn', () => {
    const s = signal(0);
    const cleanupSpy = vi.fn();
    const r = reaction(() => {
      s[K.value];
      return cleanupSpy;
    });

    r[K.subscribe](() => {});
    expect(cleanupSpy).not.toHaveBeenCalled();

    s[K.value] = 1;
    expect(cleanupSpy).toHaveBeenCalledOnce();
  });

  it('should call cleanup on dispose of last listener', () => {
    const cleanupSpy = vi.fn();
    const r = reaction(() => {
      return cleanupSpy;
    });

    const dispose = r[K.subscribe](() => {});
    expect(cleanupSpy).not.toHaveBeenCalled();

    dispose();
    expect(cleanupSpy).toHaveBeenCalledOnce();
  });

  it('should call only the cleanup from the previous run', () => {
    const s = signal(0);
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

    const r = reaction(() => {
      return s[K.value] === 0 ? cleanup1 : cleanup2;
    });

    r[K.subscribe](() => {});
    expect(cleanup1).not.toHaveBeenCalled();
    expect(cleanup2).not.toHaveBeenCalled();

    s[K.value] = 1;
    expect(cleanup1).toHaveBeenCalledOnce();
    expect(cleanup2).not.toHaveBeenCalled();

    s[K.value] = 2;
    expect(cleanup2).toHaveBeenCalledOnce();
  });

  //#endregion Cleanup Function

  //#region Re-entrancy Defense

  it('should not infinite-loop when effectFn writes to its own dependency', () => {
    const s = signal(0);
    let runCount = 0;
    const r = reaction(() => {
      runCount++;
      const v = s[K.value];
      if (v < 3) {
        s[K.value] = v + 1;
      }
    });

    r[K.subscribe](() => {});
    // The isExecuting guard should prevent re-entrant execution
    // The effect itself may re-run due to the signal engine's batch,
    // but the mutex prevents stack overflow.
    expect(runCount).toBeGreaterThanOrEqual(1);
  });

  it('should guard against re-entrant execution via isExecuting mutex', () => {
    const s = signal(0);
    const executionOrder: string[] = [];

    const r = reaction(() => {
      executionOrder.push('start');
      s[K.value];
      executionOrder.push('end');
    });

    r[K.subscribe](() => {});
    executionOrder.length = 0;

    s[K.value] = 1;
    // Each execution should complete (start+end) without nesting
    const startCount = executionOrder.filter((e) => e === 'start').length;
    const endCount = executionOrder.filter((e) => e === 'end').length;
    expect(startCount).to.equal(endCount);
  });

  //#endregion Re-entrancy Defense

  //#region Self-Disposal via this.dispose()

  it('should support self-disposal via this.dispose() in effectFn', () => {
    const s = signal(0);
    const spy = vi.fn();
    const r = reaction(function () {
      s[K.value];
      if (s[K.peek]() === 1) {
        this[K.dispose]();
      }
    });

    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    // After self-disposal, further changes should not notify
    spy.mockClear();
    s[K.value] = 2;
    expect(spy).not.toHaveBeenCalled();
  });

  it('should return a no-op unsubscribe for subscriptions after self-disposal', () => {
    const r = reaction(function () {
      this[K.dispose]();
    });

    r[K.subscribe](() => {});

    // Now isSelfDisposed is true
    const spy = vi.fn();
    const dispose = r[K.subscribe](spy);
    expect(spy).not.toHaveBeenCalled();

    // The returned dispose should be safe to call
    expect(() => dispose()).not.to.throw();
  });

  it('should block new subscriptions after self-disposal', () => {
    const s = signal(0);
    const r = reaction(function () {
      s[K.value];
      this[K.dispose]();
    });

    r[K.subscribe](() => {});

    const r2Spy = vi.fn();
    r[K.subscribe](r2Spy);

    s[K.value] = 1;
    expect(r2Spy).not.toHaveBeenCalled();
  });

  //#endregion Self-Disposal

  //#region Error Handling

  it('should propagate errors thrown by effectFn on initial subscribe', () => {
    const r = reaction(() => {
      throw new Error('boom');
    });

    expect(() => r[K.subscribe](() => {})).to.throw('boom');
  });

  it('should propagate errors thrown by effectFn on dependency change', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
      if (s[K.peek]() === 1) {
        throw new Error('deferred boom');
      }
    });

    r[K.subscribe](() => {});
    expect(() => (s[K.value] = 1)).to.throw('deferred boom');
  });

  //#endregion Error Handling

  //#region Options Forwarding

  it('should forward options to the underlying effect', () => {
    // We can't directly inspect the effect's name, but we can verify
    // that passing options doesn't break anything.
    const s = signal(0);
    const r = reaction(
      () => {
        s[K.value];
      },
      { [K.name]: 'test-reaction' },
    );

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Options Forwarding

  //#region Unsubscribe Idempotency

  it('should allow calling unsubscribe multiple times without error', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const dispose = r[K.subscribe](() => {});
    dispose();
    expect(() => dispose()).not.to.throw();
  });

  //#endregion Unsubscribe Idempotency

  //#region Conditional Dependency Tracking

  it('should re-track dependencies when effectFn re-runs with different branches', () => {
    const cond = signal(true);
    const a = signal(0);
    const b = signal(0);

    const r = reaction(() => {
      if (cond[K.value]) {
        a[K.value];
      } else {
        b[K.value];
      }
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    // a is tracked, b is not
    a[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
    spy.mockClear();

    b[K.value] = 1;
    // b change should NOT notify since cond is true
    // (b is not tracked)
    // Note: the underlying effect handles this via dependency tracking

    // Switch branch
    cond[K.value] = false;
    spy.mockClear();

    // Now b is tracked, a is not
    b[K.value] = 2;
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Conditional Dependency Tracking

  //#region Interaction with outer effect

  it('should not leak subscriptions into an outer effect context', () => {
    const s = signal(0);
    const outerSpy = vi.fn();

    effect(() => {
      outerSpy();
      const r = reaction(() => {
        s[K.value];
      });
      r[K.subscribe](() => {});
    });

    expect(outerSpy).toHaveBeenCalledOnce();
    outerSpy.mockClear();

    // Changing s should NOT re-trigger the outer effect
    s[K.value] = 1;
    // The outer effect doesn't directly read s, only the reaction does
    expect(outerSpy).not.toHaveBeenCalled();
  });

  //#endregion Interaction with outer effect

  //#region Regression: Double-dispose refCount corruption (Bug #1)

  it('should not corrupt refCount when unsubscribe is called twice', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const dispose = r[K.subscribe](() => {});
    dispose();
    dispose(); // Second call should be a no-op, not decrement refCount to -1

    // After double-dispose, a new subscription must still work
    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should not permanently kill reaction after double-dispose + re-subscribe cycle', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    // Subscribe, double-dispose
    const dispose1 = r[K.subscribe](() => {});
    dispose1();
    dispose1();

    // Subscribe again
    const spy1 = vi.fn();
    const dispose2 = r[K.subscribe](spy1);
    spy1.mockClear();
    s[K.value] = 10;
    expect(spy1).toHaveBeenCalledOnce();

    // Clean dispose
    dispose2();

    // Subscribe a third time — must still work
    const spy2 = vi.fn();
    r[K.subscribe](spy2);
    spy2.mockClear();
    s[K.value] = 20;
    expect(spy2).toHaveBeenCalledOnce();
  });

  //#endregion Regression: Double-dispose refCount corruption

  //#region Error Recovery

  it('should allow re-subscribe after effectFn throws on initial subscribe', () => {
    const s = signal(0);
    let shouldThrow = true;
    const r = reaction(() => {
      s[K.value];
      if (shouldThrow) {
        throw new Error('init error');
      }
    });

    // First subscribe throws
    expect(() => r[K.subscribe](() => {})).to.throw('init error');

    // After the throw, the reaction should be recoverable
    shouldThrow = false;
    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Error Recovery

  //#region Self-Disposal Cleanup Safety

  it('should allow existing listeners to safely unsubscribe after self-disposal', () => {
    const s = signal(0);
    const r = reaction(function () {
      s[K.value];
      if (s[K.peek]() === 1) {
        this[K.dispose]();
      }
    });

    const spy = vi.fn();
    const dispose = r[K.subscribe](spy);

    // Trigger self-disposal
    s[K.value] = 1;

    // The existing listener's dispose should be safe to call after self-disposal
    expect(() => dispose()).not.to.throw();
    // And double-dispose should also be safe
    expect(() => dispose()).not.to.throw();
  });

  it('should not notify existing listeners after self-disposal even if tickSignal subscribers remain', () => {
    const s = signal(0);
    let disposeSelfOnNext = false;
    const r = reaction(function () {
      s[K.value];
      if (disposeSelfOnNext) {
        this[K.dispose]();
      }
    });

    const spy1 = vi.fn();
    const spy2 = vi.fn();
    r[K.subscribe](spy1);
    r[K.subscribe](spy2);
    spy1.mockClear();
    spy2.mockClear();

    // Trigger self-disposal
    disposeSelfOnNext = true;
    s[K.value] = 1;

    // After self-disposal, further changes should not trigger any listener
    spy1.mockClear();
    spy2.mockClear();
    s[K.value] = 2;
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  //#endregion Self-Disposal Cleanup Safety

  //#region Cleanup Function Error Propagation

  it('should propagate errors from cleanup function', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
      return () => {
        throw new Error('cleanup boom');
      };
    });

    r[K.subscribe](() => {});
    // Changing s triggers re-run, which calls cleanup first
    expect(() => (s[K.value] = 1)).to.throw('cleanup boom');
  });

  //#endregion Cleanup Function Error Propagation

  //#region No Dependencies

  it('should handle effectFn with no signal dependencies', () => {
    let runCount = 0;
    const r = reaction(() => {
      runCount++;
    });

    const spy = vi.fn();
    r[K.subscribe](spy);
    expect(runCount).to.equal(1);

    // With no dependencies, the effect never re-runs, so listener
    // should only get the initial notification from tickSignal.subscribe
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion No Dependencies

  //#region Regression: refCount desync when listener throws (Bug #3)

  it('should not desync refCount if listener throws on initial subscribe call', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    let shouldThrow = true;
    expect(() =>
      r[K.subscribe](() => {
        if (shouldThrow) {
          throw new Error('listener boom');
        }
      }),
    ).to.throw('listener boom');

    shouldThrow = false;
    const spy = vi.fn();
    r[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 42;
    expect(spy).toHaveBeenCalledOnce();
  });

  it('should properly dispose core effect after listener-throw + multi-subscribe cycle', () => {
    const s = signal(0);
    let effectRunCount = 0;
    const r = reaction(() => {
      s[K.value];
      effectRunCount++;
    });

    // Sub 1: listener throws → refCount++ but no dispose returned
    let shouldThrow = true;
    expect(() =>
      r[K.subscribe](() => {
        if (shouldThrow) {
          throw new Error('boom');
        }
      }),
    ).to.throw('boom');
    shouldThrow = false;

    // Sub 2 + Sub 3: normal subscribers
    const spy2 = vi.fn();
    const spy3 = vi.fn();
    const dispose2 = r[K.subscribe](spy2);
    const dispose3 = r[K.subscribe](spy3);
    spy2.mockClear();
    spy3.mockClear();
    effectRunCount = 0;

    // Both should be notified
    s[K.value] = 10;
    expect(spy2).toHaveBeenCalledOnce();
    expect(spy3).toHaveBeenCalledOnce();

    // Dispose both — core effect should eventually be disposed
    dispose2();
    dispose3();
    effectRunCount = 0;

    s[K.value] = 20;
    // If refCount desynced, the core effect is still alive here
    // This is the observable consequence of Bug #3
    expect(effectRunCount).to.equal(0);
  });

  //#endregion Regression: refCount desync when listener throws
});

describe('fuse()', () => {
  //#region Interface & Brand

  it('should return a Subscribable with the correct brand', () => {
    const merged = fuse();
    expect(merged[K.brand]).to.equal(BRAND_SYMBOL);
  });

  //#endregion Interface & Brand

  //#region Basic Merge

  it('should subscribe to all child lifecycles on first subscribe', () => {
    const s1 = signal(0);
    const s2 = signal(0);
    const r1 = reaction(() => {
      s1[K.value];
    });
    const r2 = reaction(() => {
      s2[K.value];
    });

    const merged = fuse(r1, r2);
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s1[K.value] = 1;
    expect(spy).toHaveBeenCalled();
    spy.mockClear();

    s2[K.value] = 1;
    expect(spy).toHaveBeenCalled();
  });

  it('should notify listener when any child notifies', () => {
    const s1 = signal(0);
    const s2 = signal(0);
    const s3 = signal(0);
    const r1 = reaction(() => {
      s1[K.value];
    });
    const r2 = reaction(() => {
      s2[K.value];
    });
    const r3 = reaction(() => {
      s3[K.value];
    });

    const merged = fuse(r1, r2, r3);
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s2[K.value] = 42;
    expect(spy).toHaveBeenCalled();
  });

  //#endregion Basic Merge

  //#region Ref-Counting

  it('should tear down all children when last listener unsubscribes', () => {
    const s1 = signal(0);
    const s2 = signal(0);
    let r1RunCount = 0;
    let r2RunCount = 0;

    const r1 = reaction(() => {
      s1[K.value];
      r1RunCount++;
    });
    const r2 = reaction(() => {
      s2[K.value];
      r2RunCount++;
    });

    const merged = fuse(r1, r2);
    const dispose1 = merged[K.subscribe](() => {});
    const dispose2 = merged[K.subscribe](() => {});

    r1RunCount = 0;
    r2RunCount = 0;

    dispose1();
    // Still one listener, children should be alive
    s1[K.value] = 1;
    expect(r1RunCount).to.equal(1);

    r1RunCount = 0;
    r2RunCount = 0;
    dispose2();

    // All listeners gone, children should be torn down
    s1[K.value] = 2;
    s2[K.value] = 2;
    expect(r1RunCount).to.equal(0);
    expect(r2RunCount).to.equal(0);
  });

  it('should re-subscribe to children on re-subscribe after full teardown', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const merged = fuse(r);
    const dispose1 = merged[K.subscribe](() => {});
    dispose1();

    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 99;
    expect(spy).toHaveBeenCalled();
  });

  it('should support multiple listeners on merged node', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const merged = fuse(r);
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    merged[K.subscribe](spy1);
    merged[K.subscribe](spy2);
    spy1.mockClear();
    spy2.mockClear();

    s[K.value] = 1;
    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });

  //#endregion Ref-Counting

  //#region Empty Lifecycles

  it('should handle empty lifecycles array without error', () => {
    const merged = fuse();
    const spy = vi.fn();
    const dispose = merged[K.subscribe](spy);
    expect(() => dispose()).not.to.throw();
  });

  //#endregion Empty Lifecycles

  //#region Mixed Signal Types

  it('should work with plain signals as Subscribable children', () => {
    const s = signal(0);
    // A plain signal satisfies Subscribable (has brand and subscribe)
    const merged = fuse(s);
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalled();
  });

  it('should work with a mix of reactions and plain signals', () => {
    const s1 = signal(0);
    const s2 = signal(0);
    const r = reaction(() => {
      s1[K.value];
    });

    const merged = fuse(r, s2);
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s1[K.value] = 1;
    expect(spy).toHaveBeenCalled();
    spy.mockClear();

    s2[K.value] = 1;
    expect(spy).toHaveBeenCalled();
  });

  //#endregion Mixed Signal Types

  //#region Nested fuse

  it('should support nesting fuse', () => {
    const s1 = signal(0);
    const s2 = signal(0);
    const r1 = reaction(() => {
      s1[K.value];
    });
    const r2 = reaction(() => {
      s2[K.value];
    });

    const inner = fuse(r1);
    const outer = fuse(inner, r2);

    const spy = vi.fn();
    outer[K.subscribe](spy);
    spy.mockClear();

    s1[K.value] = 1;
    expect(spy).toHaveBeenCalled();
    spy.mockClear();

    s2[K.value] = 1;
    expect(spy).toHaveBeenCalled();
  });

  //#endregion Nested fuse

  //#region Unsubscribe Idempotency

  it('should allow calling unsubscribe multiple times without error', () => {
    const merged = fuse();
    const dispose = merged[K.subscribe](() => {});
    dispose();
    expect(() => dispose()).not.to.throw();
  });

  //#endregion Unsubscribe Idempotency

  //#region Single Child

  it('should pass through notifications from a single child', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const merged = fuse(r);
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();

    spy.mockClear();
    s[K.value] = 2;
    expect(spy).toHaveBeenCalledOnce();
  });

  //#endregion Single Child

  //#region Regression: Double-dispose refCount corruption (Bug #1)

  it('should not corrupt refCount when unsubscribe is called twice', () => {
    const s = signal(0);
    const r = reaction(() => {
      s[K.value];
    });

    const merged = fuse(r);
    const dispose = merged[K.subscribe](() => {});
    dispose();
    dispose(); // Second call should be a no-op

    // After double-dispose, a new subscription must still work
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 1;
    expect(spy).toHaveBeenCalled();
  });

  //#endregion Regression: Double-dispose refCount corruption

  //#region Regression: Partial subscribe leak (Bug #2)

  it('should rollback child subscriptions if a later child throws on subscribe', () => {
    const s = signal(0);
    let r1RunCount = 0;
    const r1 = reaction(() => {
      s[K.value];
      r1RunCount++;
    });

    // r2's effectFn throws — this makes r2.subscribe() throw
    const r2 = reaction(() => {
      throw new Error('child boom');
    });

    const merged = fuse(r1, r2);

    // First subscribe attempt should throw due to r2
    expect(() => merged[K.subscribe](() => {})).to.throw('child boom');

    // r1's subscription should have been rolled back — NOT leaked.
    // If leaked, r1's effect would still be alive and incrementing r1RunCount.
    r1RunCount = 0;
    s[K.value] = 1;
    expect(r1RunCount).to.equal(0);
  });

  it('should allow clean re-subscribe after a child threw during initial subscribe', () => {
    const s = signal(0);
    let shouldThrow = true;

    const r1 = reaction(() => {
      s[K.value];
    });
    const r2 = reaction(() => {
      s[K.value];
      if (shouldThrow) {
        throw new Error('init fail');
      }
    });

    const merged = fuse(r1, r2);

    // First attempt fails
    expect(() => merged[K.subscribe](() => {})).to.throw('init fail');

    // Fix the issue and re-subscribe
    shouldThrow = false;
    const spy = vi.fn();
    merged[K.subscribe](spy);
    spy.mockClear();

    s[K.value] = 99;
    expect(spy).toHaveBeenCalled();
  });

  //#endregion Regression: Partial subscribe leak

  //#region Regression: refCount desync when listener throws (Bug #3)

  it('should not desync refCount if listener throws on initial subscribe call', () => {
    const s = signal(0);
    let effectRunCount = 0;
    const r = reaction(() => {
      s[K.value];
      effectRunCount++;
    });

    const merged = fuse(r);

    // listener throws on initial invocation
    let shouldThrow = true;
    expect(() =>
      merged[K.subscribe](() => {
        if (shouldThrow) {
          throw new Error('listener boom');
        }
      }),
    ).to.throw('listener boom');
    shouldThrow = false;

    // After throw, a second subscriber + dispose cycle should properly clean up
    const spy = vi.fn();
    const dispose = merged[K.subscribe](spy);
    spy.mockClear();
    effectRunCount = 0;

    s[K.value] = 1;
    expect(spy).toHaveBeenCalledOnce();

    // Full dispose — core effect and children must be torn down
    dispose();
    effectRunCount = 0;
    s[K.value] = 2;
    expect(effectRunCount).to.equal(0);
  });

  //#endregion Regression: refCount desync when listener throws
});
