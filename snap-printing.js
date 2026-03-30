/**
 * snap-printing.js — Multi-Printer Support for Snap Station
 * Supports Canon SELPHY, standard inkjet, pro/large format, and generic printers
 */

'use strict';

export class PrintManager {
  static PRESETS = {
    selphy: {
      name: 'Canon SELPHY (CP1300/CP1500)',
      pageWidth: 6,
      pageHeight: 4,
      borderless: true,
      dpi: 300,
      colorProfile: 'sRGB',
      hint: 'In printer dialog: select "Postcard (4x6)" size and "Borderless" option.',
    },
    inkjet: {
      name: 'Standard Inkjet',
      pageWidth: 6,
      pageHeight: 4,
      borderless: false,
      dpi: 300,
      colorProfile: 'sRGB',
      hint: 'Select 4x6 photo paper or Letter. Enable borderless if your printer supports it.',
    },
    pro: {
      name: 'Pro Printer (Large Format)',
      pageWidth: 11,
      pageHeight: 8.5,
      borderless: false,
      dpi: 300,
      colorProfile: 'sRGB',
      hint: 'Prints 4 sticker sheets per page (2x2 grid) for batch production.',
    },
    generic: {
      name: 'Generic',
      pageWidth: 8.5,
      pageHeight: 11,
      borderless: false,
      dpi: 150,
      colorProfile: 'sRGB',
      hint: 'Standard printing with default margins.',
    },
  };

  /**
   * Detect printer type from a printer name string
   * @param {string} printerName
   * @returns {"selphy"|"inkjet"|"laser"|"generic"}
   */
  static detectPrinterType(printerName) {
    const name = (printerName || '').toLowerCase();
    if (name.includes('selphy') || name.includes('cp1300') || name.includes('cp1500')) {
      return 'selphy';
    }
    if (name.includes('laser') || name.includes('laserjet')) {
      return 'laser';
    }
    if (name.includes('canon') || name.includes('epson') || name.includes('hp') || name.includes('pixma')) {
      return 'inkjet';
    }
    return 'generic';
  }

  /**
   * Print a sticker sheet with printer-specific settings
   * @param {HTMLCanvasElement|string} source - canvas or data URL
   * @param {string} printerType - "selphy"|"inkjet"|"pro"|"generic"
   * @param {object} options - { borderless, copies, quality }
   */
  static async print(source, printerType = 'inkjet', options = {}) {
    const preset = this.PRESETS[printerType] || this.PRESETS.generic;
    const config = {
      ...preset,
      borderless: options.borderless !== undefined ? options.borderless : preset.borderless,
      copies: options.copies || 1,
    };

    const dataUrl = typeof source === 'string' ? source : source.toDataURL('image/png', 1.0);

    if (config.hint) {
      console.info(`[PrintManager] ${config.hint}`);
    }

    for (let i = 0; i < config.copies; i++) {
      this._doPrint(dataUrl, config);
      if (i < config.copies - 1) await new Promise(r => setTimeout(r, 300));
    }
  }

  static _doPrint(dataUrl, config) {
    const margin = config.borderless ? '0' : '0.25in';
    const fit = config.borderless ? 'cover' : 'contain';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked! Please allow pop-ups for printing.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<style>
  @page {
    size: ${config.pageWidth}in ${config.pageHeight}in;
    margin: ${margin};
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; padding: 0; background: white; }
  img {
    display: block;
    width: 100%;
    height: 100vh;
    object-fit: ${fit};
  }
  @media print {
    img { width: 100%; height: 100%; }
  }
</style>
</head>
<body>
<img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 100);" />
</body>
</html>`);
    printWindow.document.close();
  }

  /**
   * Get a user-readable hint for a printer preset
   */
  static getHint(printerType) {
    return (this.PRESETS[printerType] || this.PRESETS.generic).hint;
  }
}

// Global exposure
if (typeof window !== 'undefined') {
  window.PrintManager = PrintManager;
}
