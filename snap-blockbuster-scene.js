/* snap-blockbuster-scene.js
 *
 * Optional parallax controller for the Blockbuster shelves scene.
 * Tilts the shelves subtly as the pointer or device orientation moves,
 * giving the kiosk backdrop a shallow sense of depth without full 3D.
 * Disabled on reduced-motion or when the kiosk is in attract mode.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapBlockbusterScene = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var MAX_TILT_DEG = 1.2;
    var active = false;
    var onMove = null;

    function prefersReducedMotion() {
        return window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function enable() {
        if (active || prefersReducedMotion()) return;
        active = true;
        document.body.dataset.scene = 'blockbuster-shelves';
        onMove = function (e) {
            var cx = (e.clientX / window.innerWidth) - 0.5;
            var cy = (e.clientY / window.innerHeight) - 0.5;
            document.body.style.setProperty('--bb-tilt-x',
                (cy * MAX_TILT_DEG).toFixed(2) + 'deg');
            document.body.style.setProperty('--bb-tilt-y',
                (-cx * MAX_TILT_DEG).toFixed(2) + 'deg');
        };
        window.addEventListener('pointermove', onMove, { passive: true });
    }

    function disable() {
        if (!active) return;
        active = false;
        delete document.body.dataset.scene;
        if (onMove) window.removeEventListener('pointermove', onMove);
        onMove = null;
        document.body.style.removeProperty('--bb-tilt-x');
        document.body.style.removeProperty('--bb-tilt-y');
    }

    return { enable: enable, disable: disable };
}));
