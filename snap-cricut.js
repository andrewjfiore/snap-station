/**
 * snap-cricut.js — Cricut Kiss-Cut Export for Snap Station
 * Generates a ZIP with:
 *   - PNG: sticker sheet + registration marks (for printing)
 *   - SVG: cut paths for each sticker + registration marks (for Cricut)
 *   - README: instructions
 */

'use strict';

export class CricutExporter {
  /**
   * Generate a Cricut-ready export package
   * @param {HTMLCanvasElement} stickerCanvas
   * @param {object} options
   * @returns {Promise<Blob>} ZIP blob
   */
  static async generateKissCutPackage(stickerCanvas, options = {}) {
    const {
      cutOffset = 2,
      stickerRows = 4,
      stickerCols = 4,
      sheetWidthMm = 120,
      sheetHeightMm = 180,
    } = options;

    // 1. Add registration marks to PNG
    const printCanvas = this.addRegistrationMarks(stickerCanvas);
    const printPng = printCanvas.toDataURL('image/png', 1.0);

    // 2. Generate SVG with cut paths
    const svgContent = this.generateCutSVG({ sheetWidthMm, sheetHeightMm, stickerRows, stickerCols, cutOffset });

    // 3. Create ZIP using JSZip
    const JSZip = window.JSZip;
    if (!JSZip) {
      throw new Error('JSZip not loaded. Please include jszip.min.js.');
    }

    const zip = new JSZip();
    zip.file('snap_station_PRINT.png', printPng.split(',')[1], { base64: true });
    zip.file('snap_station_CUT.svg', svgContent);
    zip.file('README.txt', CricutExporter.instructions);

    const blob = await zip.generateAsync({ type: 'blob' });
    return blob;
  }

  /**
   * Add registration marks to a canvas
   * @param {HTMLCanvasElement} source
   * @returns {HTMLCanvasElement}
   */
  static addRegistrationMarks(source) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(source, 0, 0);

    // Registration mark size in pixels (~5mm at 300dpi = 59px, use 40px for web)
    const markSize = Math.round(source.width * 0.04);
    const markPad = Math.round(source.width * 0.02);

    // 3 corner registration marks (top-left, top-right, bottom-left)
    const marks = [
      { x: markPad, y: markPad },
      { x: source.width - markPad - markSize, y: markPad },
      { x: markPad, y: source.height - markPad - markSize },
    ];

    ctx.fillStyle = 'black';
    for (const { x, y } of marks) {
      // Draw outer square
      ctx.fillRect(x, y, markSize, markSize);
      // Hollow out center (inner white square)
      ctx.fillStyle = 'white';
      const inner = markSize * 0.3;
      ctx.fillRect(x + inner, y + inner, markSize - inner * 2, markSize - inner * 2);
      ctx.fillStyle = 'black';
    }

    return canvas;
  }

  /**
   * Generate an SVG cut file with sticker paths and registration marks
   */
  static generateCutSVG({ sheetWidthMm, sheetHeightMm, stickerRows, stickerCols, cutOffset }) {
    const cellW = sheetWidthMm / stickerCols;
    const cellH = sheetHeightMm / stickerRows;
    const off = cutOffset;

    let paths = '';
    for (let r = 0; r < stickerRows; r++) {
      for (let c = 0; c < stickerCols; c++) {
        const x = (c * cellW + off).toFixed(2);
        const y = (r * cellH + off).toFixed(2);
        const w = (cellW - 2 * off).toFixed(2);
        const h = (cellH - 2 * off).toFixed(2);
        paths += `    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" ry="2" />\n`;
      }
    }

    // Registration marks (3 corners)
    const marks = [
      { x: 3, y: 3 },
      { x: sheetWidthMm - 8, y: 3 },
      { x: 3, y: sheetHeightMm - 8 },
    ].map(({ x, y }) =>
      `    <rect x="${x}" y="${y}" width="5" height="5" fill="black" />`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${sheetWidthMm}mm" height="${sheetHeightMm}mm"
     viewBox="0 0 ${sheetWidthMm} ${sheetHeightMm}">
  <!-- Registration marks for Cricut Print-then-Cut -->
${marks}
  <!-- Cut paths (kiss cut, goes through vinyl not backing) -->
  <g fill="none" stroke="black" stroke-width="0.1">
${paths}  </g>
</svg>`;
  }

  static get instructions() {
    return `CRICUT PRINT-THEN-CUT INSTRUCTIONS
=====================================

Files in this package:
  snap_station_PRINT.png  — Print this on your sticker paper
  snap_station_CUT.svg    — Import this into Cricut Design Space

Steps:
1. Print snap_station_PRINT.png on sticker paper (matte or glossy photo)
   - Use your printer's highest quality setting
   - Let it dry completely before loading into Cricut
2. Load the printed sheet into your Cricut machine
3. Open Cricut Design Space
4. Click "Upload" → import snap_station_CUT.svg as a cut file
5. Enable "Print-then-Cut" mode in Design Space
6. Use the registration marks (black squares in corners) for alignment
7. Set cut pressure for sticker paper (kiss cut — through vinyl, not backing)
   - Start with "Sticker Paper, White" material setting
   - Adjust pressure if needed

Tips:
- Kiss cut = cuts through the vinyl layer only, leaving backing intact
- Registration marks must be visible for Cricut to align correctly
- Do not trim the printed sheet before loading into Cricut

Generated by Pokémon Snap Station
https://github.com/andrewjfiore/snap-station
`;
  }

  /**
   * Trigger a browser download of the ZIP
   * @param {Blob} blob
   * @param {string} filename
   */
  static downloadBlob(blob, filename = 'snap_station_cricut.zip') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Global exposure
if (typeof window !== 'undefined') {
  window.CricutExporter = CricutExporter;
}
