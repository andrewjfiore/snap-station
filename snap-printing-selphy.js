/* snap-printing-selphy.js
 *
 * Canon Selphy adapter. Talks to the sibling print-server
 * (deploy/print-server/server.js) over HTTP localhost; the server shells
 * out to CUPS `lp` since Selphy is well supported via gutenprint.
 *
 * Primary target: Selphy CP1500 postcard / hagaki. Layout descriptor
 * SnapLayouts.getLayout('4x4') maps 1:1 to Selphy's 100x148 mm media.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapPrintingSelphy = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DEFAULT_ENDPOINT = 'http://127.0.0.1:47002/print';
    var DEFAULT_PRINTER = 'Canon_Selphy';
    var DEFAULT_MEDIA = 'Postcard.Borderless';

    function submit(blob, opts) {
        opts = opts || {};
        var endpoint = opts.endpoint || DEFAULT_ENDPOINT;
        var fd = new FormData();
        fd.append('printer', opts.printer || DEFAULT_PRINTER);
        fd.append('media', opts.media || DEFAULT_MEDIA);
        fd.append('image', blob, 'sticker_sheet.bmp');
        return fetch(endpoint, { method: 'POST', body: fd })
            .then(function (r) {
                if (!r.ok) throw new Error('print HTTP ' + r.status);
                return r.json();
            });
    }

    return { submit: submit, DEFAULT_PRINTER: DEFAULT_PRINTER };
}));
