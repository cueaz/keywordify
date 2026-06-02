/**
 * @license
 * Copyright 2026-present cueaz (Modifications)
 * Copyright 2023 Google LLC (Original Work)
 *
 * This file has been modified from its original version.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type { ReadonlySignal, Subscribable } from '@keywordify/signals';
import * as K from '~keywords';
import { AsyncDirective } from '../async-directive.js';
import { directive } from '../directive.js';
import { nothing } from '../lit-html.js';

class WatchDirective extends AsyncDirective {
  private [K.__signal]?: ReadonlySignal | Subscribable;
  private [K.__isSignal]?: boolean;
  private [K.__dispose]?: (() => void) | undefined;

  override [K.render](signal: ReadonlySignal | Subscribable) {
    if (signal !== this[K.__signal]) {
      this[K.__dispose]?.();
      this[K.__signal] = signal;
      this[K.__isSignal] = K.peek in signal;

      // Whether the subscribe() callback is called because of this render
      // pass, or because of a separate signal update.
      let updateFromLit = true;
      this[K.__dispose] = signal[K.subscribe]((value) => {
        // The subscribe() callback is called synchronously during subscribe.
        // Ignore the first call since we return the value below in that case.
        if (updateFromLit === false) {
          if (this[K.__isSignal]) {
            this[K.setValue](value);
          }
        }
      });
      updateFromLit = false;
    }

    // We use peek() so that the signal access is not tracked by the effect
    // created by SignalWatcher.performUpdate(). This means that a signal
    // update won't trigger a full element update if it's only passed to
    // watch() and not otherwise accessed by the element.
    return this[K.__isSignal] ? (signal as ReadonlySignal)[K.peek]() : nothing;
  }

  protected override [K.disconnected](): void {
    this[K.__dispose]?.();
  }

  protected override [K.reconnected](): void {
    // Since we disposed the subscription in disconnected() we need to
    // resubscribe here. We don't ignore the synchronous callback call because
    // the signal might have changed while the directive is disconnected.
    //
    // There are two possible reasons for a disconnect:
    //   1. The host element was disconnected.
    //   2. The directive was not rendered during a render
    // In the first case the element will not schedule an update on reconnect,
    // so we need the synchronous call here to set the current value.
    // In the second case, we're probably reconnecting *because* of a render,
    // so the synchronous call here will go before a render call, and we'll get
    // two sets of the value (setValue() here and the return in render()), but
    // this is ok because the value will be dirty-checked by lit-html.
    this[K.__dispose] = this[K.__signal]?.[K.subscribe]((value) => {
      if (this[K.__isSignal]) {
        this[K.setValue](value);
      }
    });
  }
}

/**
 * Renders a signal and subscribes to it, updating the part when the signal
 * changes.
 */
export const watch = directive(WatchDirective);
