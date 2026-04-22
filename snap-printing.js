/**
 * snap-printing.js — Multi-printer support for Snap Station
 * Handles Canon SELPHY, inkjet, laser, and generic printers.
 */

class PrintManager {
  static PRESETS = {
    selphy: {
      label: 'Canon SELPHY',
      pageWidth: 4,
      pageHeight: 6,
      borderless: true,
      dpi: 300,
      hint: 'Select "Postcard (4x6)" and "Borderless" in the print dialog.',
    },
    inkjet: {
      label: 'Standard Inkjet',
      pageWidth: 4,
      pageHeight: 6,
      borderless: false,
      dpi: 300,
      hint: 'For best results use 4x6 photo paper. Enable borderless if supported.',
    },
    laser: {
      label: 'Laser / Letter',
      pageWidth: 8.5,
      pageHeight: 11,
      borderless: false,
      dpi: 300,
      hint: 'Prints 4 sticker sheets per page on Letter paper.',
      multiUp: true,
    },
    generic: {
      label: 'Generic Printer',
      pageWidth: 8.5,
      pageHeight: 11,
      borderless: false,
      dpi: 150,
      hint: 'Standard print. Use the highest quality setting available.',
    },
  };

  /**
   * Detect printer type from name heuristics.
   * @param {string} printerName
   * @returns {"selphy"|"inkjet"|"laser"|"generic"}
   */
  static detectPrinterType(printerName) {
    if (!printerName) return 'generic';
    const name = printerName.toLowerCase();
    if (name.includes('selphy') || name.includes('cp1300') || name.includes('cp1500')) return 'selphy';
    if (name.includes('inkjet') || name.includes('pixma') || name.includes('epson') ||
        name.includes('deskjet') || name.includes('officejet')) return 'inkjet';
    if (name.includes('laser') || name.includes('laserjet') || name.includes('brother')) return 'laser';
    return 'generic';
  }

  /**
   * Print a sticker sheet.
   * @param {HTMLCanvasElement|string} source - canvas or data URL
   * @param {string} printerType - "selphy"|"inkjet"|"laser"|"generic"
   * @param {object} options
   */
  static async print(source, printerType = 'generic', options = {}) {
    const preset = { ...this.PRESETS[printerType] || this.PRESETS.generic, ...options };
    const dataUrl = source instanceof HTMLCanvasElement
      ? source.toDataURL('image/png', 1.0)
      : source;

    if (preset.hint) {
      console.info(`[PrintManager] Hint for ${preset.label}: ${preset.hint}`);
    }

    if (preset.multiUp) {
      return this._printMultiUp(dataUrl, preset);
    }
    return this._printSingle(dataUrl, preset);
  }

  static _printSingle(dataUrl, preset) {
    const margin = preset.borderless ? '0' : '0.25in';
    const fit = preset.borderless ? 'cover' : 'contain';
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<style>
  @page { size: ${preset.pageWidth}in ${preset.pageHeight}in; margin: ${margin}; }
  body { margin: 0; padding: 0; background: white; }
  img { width: 100%; height: 100%; object-fit: ${fit}; display: block; }
</style>
</head><body>
<img src="${dataUrl}" onload="window.print();window.close();" />
</body></html>`);
    win.document.close();
  }

  static _printMultiUp(dataUrl, preset) {
    // 4-up layout on letter paper
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups to print.'); return; }
    win.document.write(`<!DOCTYPE html><html><head>
<style>
  @page { size: ${preset.pageWidth}in ${preset.pageHeight}in; margin: 0.25in; }
  body { margin: 0; padding: 0; background: white; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 0.1in; width: 100%; height: 100vh; }
  img { width: 100%; height: 100%; object-fit: contain; }
</style>
</head><body>
<div class="grid">
  <img src="${dataUrl}" /><img src="${dataUrl}" />
  <img src="${dataUrl}" /><img src="${dataUrl}" />
</div>
<script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body></html>`);
    win.document.close();
  }
}

// ─── Print Settings UI ────────────────────────────────────────────────────────

class PrintSettingsUI {
  constructor() {
    this.panel = document.getElementById('printSettingsPanel');
    this.printerTypeSelect = document.getElementById('printerTypeSelect');
    this.paperSizeSelect = document.getElementById('paperSizeSelect');
    this.borderlessCheck = document.getElementById('borderlessCheck');
    this.copiesInput = document.getElementById('copiesInput');
    this._bindEvents();
    this._loadSettings();
  }

  _bindEvents() {
    const gearBtn = document.getElementById('printGearBtn');
    if (gearBtn) gearBtn.addEventListener('click', () => this.toggle());

    const closeBtn = document.getElementById('closePrintSettingsBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

    if (this.printerTypeSelect) {
      this.printerTypeSelect.addEventListener('change', () => this._saveSettings());
    }
  }

  _loadSettings() {
    const saved = JSON.parse(localStorage.getItem('snap-printSettings') || '{}');
    if (this.printerTypeSelect && saved.printerType) {
      this.printerTypeSelect.value = saved.printerType;
    }
    if (this.borderlessCheck && saved.borderless !== undefined) {
      this.borderlessCheck.checked = saved.borderless;
    }
    if (this.copiesInput && saved.copies) {
      this.copiesInput.value = saved.copies;
    }
  }

  _saveSettings() {
    const settings = {
      printerType: this.printerTypeSelect ? this.printerTypeSelect.value : 'generic',
      borderless: this.borderlessCheck ? this.borderlessCheck.checked : false,
      copies: this.copiesInput ? parseInt(this.copiesInput.value) || 1 : 1,
    };
    localStorage.setItem('snap-printSettings', JSON.stringify(settings));
    return settings;
  }

  getSettings() {
    return JSON.parse(localStorage.getItem('snap-printSettings') || '{"printerType":"generic","borderless":false,"copies":1}');
  }

  toggle() {
    if (this.panel) this.panel.classList.toggle('active');
  }

  hide() {
    if (this.panel) this.panel.classList.remove('active');
  }
}

window.PrintManager = PrintManager;
window.PrintSettingsUI = PrintSettingsUI;
