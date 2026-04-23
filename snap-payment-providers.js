/* snap-payment-providers.js
 *
 * Provider interface for the kiosk payment pipeline. The existing
 * snap-payment.js ships the PIN keypad as the v1 "mock" provider;
 * real providers (Stripe Terminal, Square, Adyen, vendor-specific)
 * slot in here without touching the UI layer.
 *
 * Contract:
 *   provider.name: string
 *   provider.available(): Promise<boolean>
 *   provider.charge({ amountCents, currency, description }): Promise<{
 *     success: boolean, transactionId?: string, credits?: number,
 *     error?: string
 *   }>
 *   provider.refund(transactionId): Promise<{ success: boolean }>  // optional
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapPaymentProviders = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var providers = {};
    var active = null;

    function register(provider) {
        if (!provider || !provider.name) {
            throw new Error('provider must have a name');
        }
        providers[provider.name] = provider;
    }

    function list() { return Object.keys(providers); }

    function select(name) {
        if (!providers[name]) {
            throw new Error('unknown provider: ' + name);
        }
        active = providers[name];
        return active;
    }

    function current() { return active; }

    /* --- Built-in mock provider ----------------------------------------
     * Always reports available. Issues credits instantly. Used in dev,
     * in CI (Playwright), and as a fallback when network providers are
     * unreachable.
     */
    var MockProvider = {
        name: 'mock',
        available: function () { return Promise.resolve(true); },
        charge: function (req) {
            var credits = Math.max(1, Math.floor((req.amountCents || 500) / 500));
            return Promise.resolve({
                success: true,
                transactionId: 'mock-' + Date.now(),
                credits: credits
            });
        },
        refund: function () { return Promise.resolve({ success: true }); }
    };
    register(MockProvider);
    select('mock');

    /* --- Stripe Terminal placeholder -----------------------------------
     * Populated when a real SDK key + reader are configured via admin.
     * Until then it reports unavailable so the UI falls back to mock.
     */
    var StripeTerminal = {
        name: 'stripe-terminal',
        available: function () { return Promise.resolve(false); },
        charge: function () {
            return Promise.resolve({
                success: false, error: 'not configured'
            });
        }
    };
    register(StripeTerminal);

    return {
        register: register,
        select: select,
        current: current,
        list: list,
        MockProvider: MockProvider
    };
}));
