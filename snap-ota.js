/* snap-ota.js
 *
 * OTA (over-the-air) update channel skeleton. Provider-agnostic; real
 * backend (self-hosted manifest / GitHub Releases / vendor MDM) slots
 * in via setBackend(). Default backend is null-op so the kiosk does
 * nothing until the operator configures a channel.
 *
 * Checks are never automatic on kiosk boot; the attendant triggers them
 * from admin.html via AttendantLock. Rolling updates during an active
 * customer session are explicitly not supported; the kiosk waits for
 * the idle screen before applying.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapOta = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var CURRENT_VERSION = '0.0.0-dev';
    var backend = null;

    function setVersion(v) { CURRENT_VERSION = v; }

    function setBackend(impl) {
        // impl: { check(): Promise<{available: bool, version, url}>,
        //         apply(manifest): Promise<{success: bool, error?}> }
        backend = impl;
    }

    function check() {
        if (!backend) return Promise.resolve({ available: false });
        return backend.check();
    }

    function apply(manifest) {
        if (!backend) return Promise.resolve({ success: false, error: 'no backend' });
        if (isBusy()) {
            return Promise.resolve({
                success: false,
                error: 'kiosk busy; defer until idle'
            });
        }
        return backend.apply(manifest);
    }

    function isBusy() {
        // Busy signal comes from the main kiosk state. Anything that
        // sets data-kiosk-busy="true" on <body> blocks updates.
        if (typeof document === 'undefined') return false;
        return document.body && document.body.dataset.kioskBusy === 'true';
    }

    return {
        version: function () { return CURRENT_VERSION; },
        setVersion: setVersion,
        setBackend: setBackend,
        check: check,
        apply: apply,
        isBusy: isBusy
    };
}));
