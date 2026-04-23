/* snap-printing-instax.js
 *
 * Fujifilm Instax adapter.
 *
 * IMPORTANT: Instax paper is NOT compatible with the 148x100 mm hagaki
 * layout. The Instax layouts differ by model:
 *   - Mini Link       54x86 mm      aspect 1.59 (like a credit card)
 *   - Square Link     62x62 mm      aspect 1.00
 *   - Wide Link       86x108 mm     aspect 1.26
 *
 * Using Instax requires a separate layout descriptor whose outer size
 * matches the chosen paper. Adding 'instax-mini-4x2', 'instax-square-4x4',
 * and 'instax-wide-4x3' layouts to snap-layouts.js is pending.
 *
 * This adapter ships as a disabled stub so the UI can still surface an
 * Instax option that renders an informative message rather than attempting
 * an invalid print.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapPrintingInstax = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function available() { return Promise.resolve(false); }

    function submit() {
        return Promise.resolve({
            success: false,
            error: 'Instax driver requires Instax-specific layout; pending.'
        });
    }

    return {
        available: available,
        submit: submit,
        requiredLayouts: ['instax-mini-4x2', 'instax-square-4x4', 'instax-wide-4x3']
    };
}));
