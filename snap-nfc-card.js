/* snap-nfc-card.js
 *
 * Skeuomorphic tap-to-pay card element that appears on the home screen
 * once the player has purchased credit. Mounts into a host container,
 * renders the card DOM, and animates in/out on state change.
 *
 * Usage:
 *   const card = SnapNfcCard.mount(document.querySelector('#nfc-mount'));
 *   card.show(credits);    // animate in with balance readout
 *   card.hide();
 *   card.flash();          // simulate a tap for demo / attract mode
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapNfcCard = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var MARKUP = [
        '<div class="nfc-card" aria-hidden="true">',
        '  <div class="nfc-card-inner">',
        '    <div class="nfc-card-chip"></div>',
        '    <div class="nfc-card-wave">',
        '      <span></span><span></span><span></span>',
        '    </div>',
        '    <div class="nfc-card-brand">SNAP&nbsp;STATION</div>',
        '    <div class="nfc-card-credits">',
        '      <span class="nfc-card-credits-label">CREDITS</span>',
        '      <span class="nfc-card-credits-value">0</span>',
        '    </div>',
        '    <div class="nfc-card-holo"></div>',
        '  </div>',
        '</div>'
    ].join('');

    function mount(host) {
        if (!host) throw new Error('SnapNfcCard.mount: missing host');
        host.insertAdjacentHTML('beforeend', MARKUP);
        var card = host.querySelector('.nfc-card');
        var credits = card.querySelector('.nfc-card-credits-value');

        return {
            show: function (n) {
                credits.textContent = String(n | 0);
                card.classList.add('visible');
                card.setAttribute('aria-hidden', 'false');
            },
            hide: function () {
                card.classList.remove('visible');
                card.setAttribute('aria-hidden', 'true');
            },
            flash: function () {
                card.classList.add('tapping');
                setTimeout(function () {
                    card.classList.remove('tapping');
                }, 600);
            },
            setCredits: function (n) { credits.textContent = String(n | 0); },
            el: card
        };
    }

    return { mount: mount };
}));
