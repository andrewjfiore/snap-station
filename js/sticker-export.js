// ======= Sticker export pipeline — shared by the kiosk app and the classic composer =======
// Pure/portable pieces only: SVG cut-path generation, the hidden-iframe print
// pipeline, PDF assembly, and download plumbing. DOM orchestration (html2canvas
// of the live sheet, Cropper canvases) stays with whichever UI calls this.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sticker-constants.js'));
  } else {
    root.StickerExport = factory(root);
  }
}(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  var fmt = function (n) { return Math.round(n * 1000) / 1000; };

  // --- VECTOR SVG EXPORT (Cricut Design Space / Silhouette Studio compatible) ---
  // With opts.imageDataUrl, the printed sheet is embedded as a raster layer inside
  // the same SVG, locked under the cut paths: uploading this ONE file to Cricut
  // Design Space gives a Print-Then-Cut design where the photo and the kiss cuts
  // are already aligned — nobody positions cuts by hand. Without imageDataUrl it
  // is a cut-only template. opts.registrationMarks adds corner crosses for
  // cutters/workflows that want printed registration (Silhouette manual setups).
  function buildCutSvg(opts) {
    opts = opts || {};
    // layoutId picks the cut paths: grid layouts share the 16-cell kiss cuts;
    // 'big' (design system v4) cuts one full-envelope rounded rect.
    var g = C.getSheetGeometry(opts.paperId || '4x6', opts.layoutId || 'single');
    var pW = g.paper.w, pH = g.paper.h;

    var d = '';
    for (var i = 0; i < g.cells.length; i++) {
      var k = g.cells[i].kiss;
      var x0 = k.x, y0 = k.y, x1 = k.x + k.w, y1 = k.y + k.h, r = k.r;
      d += 'M ' + fmt(x0 + r) + ' ' + fmt(y0) + ' '
         + 'L ' + fmt(x1 - r) + ' ' + fmt(y0) + ' Q ' + fmt(x1) + ' ' + fmt(y0) + ' ' + fmt(x1) + ' ' + fmt(y0 + r) + ' '
         + 'L ' + fmt(x1) + ' ' + fmt(y1 - r) + ' Q ' + fmt(x1) + ' ' + fmt(y1) + ' ' + fmt(x1 - r) + ' ' + fmt(y1) + ' '
         + 'L ' + fmt(x0 + r) + ' ' + fmt(y1) + ' Q ' + fmt(x0) + ' ' + fmt(y1) + ' ' + fmt(x0) + ' ' + fmt(y1 - r) + ' '
         + 'L ' + fmt(x0) + ' ' + fmt(y0 + r) + ' Q ' + fmt(x0) + ' ' + fmt(y0) + ' ' + fmt(x0 + r) + ' ' + fmt(y0) + ' Z ';
    }

    var imageLayer = opts.imageDataUrl
      ? '<g inkscape:groupmode="layer" inkscape:label="Print" id="print-layer">\n'
        + '<image x="0" y="0" width="' + pW + '" height="' + pH + '" preserveAspectRatio="none" href="' + opts.imageDataUrl + '" xlink:href="' + opts.imageDataUrl + '"/>\n'
        + '</g>\n'
      : '';

    var regLayer = '';
    if (opts.registrationMarks) {
      var cross = function (x, y) {
        return '<path d="M ' + fmt(x - 3) + ' ' + fmt(y) + ' L ' + fmt(x + 3) + ' ' + fmt(y)
             + ' M ' + fmt(x) + ' ' + fmt(y - 3) + ' L ' + fmt(x) + ' ' + fmt(y + 3) + '" stroke="#ff0000" stroke-width="0.2" fill="none"/>';
      };
      regLayer = '<g inkscape:groupmode="layer" inkscape:label="Registration" id="reg-layer">\n'
        + cross(5, 5) + cross(pW - 5, 5) + cross(5, pH - 5) + cross(pW - 5, pH - 5) + '\n</g>\n';
    }

    return '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="' + pW + 'mm" height="' + pH + 'mm" viewBox="0 0 ' + pW + ' ' + pH + '">\n'
      + imageLayer + regLayer
      + '<g inkscape:groupmode="layer" inkscape:label="Cut" id="cut-layer" fill="none" stroke="#000000" stroke-width="0.01">\n'
      + '<path d="' + d.trim() + '"/>\n'
      + '</g>\n</svg>';
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // --- PRINT PIPELINE ---
  // Renders the sheet image into a hidden iframe sized exactly to the paper and
  // opens the print dialog. Resolves after printing (or a 60 s safety timeout).
  function printSheetImage(imgDataUrl, pWmm, pHmm) {
    return new Promise(function (resolve) {
      var iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
      document.body.appendChild(iframe);
      var cleanup = function () { try { iframe.remove(); } catch (e) {} resolve(); };
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>Snap Station Stickers</title><style>'
        + '@page { size: ' + pWmm + 'mm ' + pHmm + 'mm; margin: 0; }'
        + 'html, body { margin: 0; padding: 0; background: #fff; }'
        + 'img { display: block; width: ' + pWmm + 'mm; height: ' + pHmm + 'mm; }'
        + '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'
        + '</style></head><body><img alt="Sticker sheet" src="' + imgDataUrl + '"></body></html>';
      var idoc = iframe.contentDocument || iframe.contentWindow.document;
      idoc.open(); idoc.write(html); idoc.close();
      var img = idoc.querySelector('img');
      var doPrint = function () {
        try {
          var win = iframe.contentWindow;
          win.focus(); win.print();
          var onAfter = function () { win.removeEventListener('afterprint', onAfter); cleanup(); };
          win.addEventListener('afterprint', onAfter);
          setTimeout(cleanup, 60000);
        } catch (e) { cleanup(); }
      };
      if (img && !img.complete) { img.onload = doPrint; img.onerror = doPrint; }
      else { doPrint(); }
    });
  }

  // --- PDF ---
  // canvas: a rendered sheet canvas; jspdfNs: the jspdf UMD namespace (window.jspdf).
  function savePdfFromCanvas(canvas, pWmm, pHmm, jspdfNs, filename) {
    var imgData = canvas.toDataURL('image/png');
    var orientation = pWmm > pHmm ? 'landscape' : 'portrait';
    var pdf = new jspdfNs.jsPDF({ orientation: orientation, unit: 'mm', format: [pWmm, pHmm] });
    pdf.addImage(imgData, 'PNG', 0, 0, pWmm, pHmm);
    pdf.save(filename || 'snap-station-stickers.pdf');
  }

  // --- Optional kiosk print-server bridge (deploy/print-server) ---
  // POSTs the sheet PNG to a local print bridge; rejects with a descriptive error
  // so callers can fall back to printSheetImage().
  function printViaServer(serverUrl, blob, opts) {
    opts = opts || {};
    var form = new FormData();
    form.append('printer', opts.printer || '');
    form.append('media', opts.media || '');
    form.append('image', blob, 'sticker-sheet.png');
    return fetch(serverUrl.replace(/\/$/, '') + '/print', { method: 'POST', body: form })
      .then(function (r) {
        if (!r.ok) throw new Error('Print server responded ' + r.status);
        return r.json();
      });
  }

  return {
    buildCutSvg: buildCutSvg,
    triggerDownload: triggerDownload,
    printSheetImage: printSheetImage,
    savePdfFromCanvas: savePdfFromCanvas,
    printViaServer: printViaServer,
  };
}));
