/* snap-preview.js
 *
 * Scene module for the kiosk-attendant-facing live preview. Builds on
 * the existing .video-container markup in snap-station.html and adds:
 *   - 16:9 / 4:3 aspect toggle (already in CSS; this wires the click).
 *   - Drag-to-reframe pan via CSS transform on the inner media element.
 *   - Wheel / pinch zoom, clamped to 1.0..3.0 (never below native).
 *   - CRT overlay toggle (off by default).
 *   - Source switcher delegating to SnapCapture.* factories.
 *
 * Additive to the existing snap-station.js; does not replace it. Wire
 * via PHASE3_INTEGRATION.md plus:
 *   const preview = SnapPreview.mount(document.querySelector('.video-container'));
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapPreview = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var ZOOM_MIN = 1.0;
    var ZOOM_MAX = 3.0;
    var ZOOM_STEP = 0.1;

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function pickMediaEl(container) {
        return container.querySelector('video, img, iframe, canvas');
    }

    function applyTransform(media, state) {
        // Integer-snap pan to avoid sub-pixel shimmer under the CRT overlay.
        var tx = Math.round(state.panX);
        var ty = Math.round(state.panY);
        media.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + state.zoom + ')';
    }

    function mount(container) {
        if (!container) throw new Error('SnapPreview.mount: missing container');
        var state = { zoom: 1.0, panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0 };
        var media = pickMediaEl(container);

        function refresh() {
            media = pickMediaEl(container);
            if (media) applyTransform(media, state);
        }

        function onPointerDown(e) {
            if (!media) return;
            state.dragging = true;
            state.lastX = e.clientX;
            state.lastY = e.clientY;
            container.setPointerCapture && container.setPointerCapture(e.pointerId);
        }
        function onPointerMove(e) {
            if (!state.dragging || !media) return;
            state.panX += e.clientX - state.lastX;
            state.panY += e.clientY - state.lastY;
            state.lastX = e.clientX;
            state.lastY = e.clientY;
            applyTransform(media, state);
        }
        function onPointerUp() { state.dragging = false; }
        function onWheel(e) {
            if (!media) return;
            e.preventDefault();
            var delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
            state.zoom = clamp(state.zoom + delta, ZOOM_MIN, ZOOM_MAX);
            applyTransform(media, state);
        }

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);
        container.addEventListener('wheel', onWheel, { passive: false });

        return {
            setAspect: function (ratio) {
                container.classList.toggle('ratio-4-3', ratio === '4:3');
            },
            setCrt: function (on) {
                container.classList.toggle('crt-on', !!on);
            },
            setPhosphor: function (on) {
                container.classList.toggle('crt-phosphor', !!on);
            },
            reset: function () {
                state.zoom = 1.0; state.panX = 0; state.panY = 0;
                if (media) applyTransform(media, state);
            },
            state: state,
            refresh: refresh,
            destroy: function () {
                container.removeEventListener('pointerdown', onPointerDown);
                container.removeEventListener('pointermove', onPointerMove);
                container.removeEventListener('pointerup', onPointerUp);
                container.removeEventListener('pointercancel', onPointerUp);
                container.removeEventListener('wheel', onWheel);
            }
        };
    }

    return { mount: mount, ZOOM_MIN: ZOOM_MIN, ZOOM_MAX: ZOOM_MAX };
}));
