/* snap-attendant-lock.js
 *
 * Hold-to-unlock gate. Attaches to any element; pressing + holding for
 * N milliseconds fires the unlock callback. Used to gate admin.html,
 * the settings panel, and any other attendant-only surface from child
 * tampering.
 *
 * Usage:
 *   SnapAttendantLock.attach(buttonEl, { holdMs: 2500, onUnlock: ... });
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapAttendantLock = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function attach(el, opts) {
        opts = opts || {};
        var holdMs = opts.holdMs || 2500;
        var onUnlock = opts.onUnlock || function () {};
        var onProgress = opts.onProgress || function () {};
        var timer = null;
        var startedAt = 0;
        var rafId = 0;

        function tick() {
            var elapsed = Date.now() - startedAt;
            onProgress(Math.min(1, elapsed / holdMs));
            if (elapsed < holdMs) {
                rafId = requestAnimationFrame(tick);
            }
        }

        function start() {
            if (timer) return;
            startedAt = Date.now();
            onProgress(0);
            rafId = requestAnimationFrame(tick);
            timer = setTimeout(function () {
                timer = null;
                cancelAnimationFrame(rafId);
                onProgress(1);
                onUnlock();
            }, holdMs);
        }

        function cancel() {
            if (timer) { clearTimeout(timer); timer = null; }
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
            onProgress(0);
        }

        el.addEventListener('pointerdown', start);
        el.addEventListener('pointerup', cancel);
        el.addEventListener('pointercancel', cancel);
        el.addEventListener('pointerleave', cancel);

        return {
            detach: function () {
                cancel();
                el.removeEventListener('pointerdown', start);
                el.removeEventListener('pointerup', cancel);
                el.removeEventListener('pointercancel', cancel);
                el.removeEventListener('pointerleave', cancel);
            }
        };
    }

    return { attach: attach };
}));
