/**
 * snap-payment.js — Luhn PIN-based credit system for Snap Station
 * No server required. PINs self-validate via Luhn checksum.
 * Credits stored in localStorage.
 */

class PaymentSystem {
  static CREDIT_CODES = { '01': 1, '02': 2, '05': 5, '10': 10 };

  /** Luhn validation */
  static luhnValid(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = parseInt(digits[digits.length - 1 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  }

  /** Decode a PIN: returns { valid, credits, error } */
  static decodePin(pin) {
    const digits = pin.replace(/\D/g, '');
    if (digits.length !== 10) return { valid: false, error: 'PIN must be 10 digits' };
    if (!this.luhnValid(digits)) return { valid: false, error: 'Invalid PIN (checksum failed)' };

    const code = digits.slice(0, 2);
    const credits = this.CREDIT_CODES[code];
    if (!credits) return { valid: false, error: 'Unknown credit tier' };

    const used = JSON.parse(localStorage.getItem('snap-usedPins') || '[]');
    if (used.includes(digits)) return { valid: false, error: 'PIN already used' };

    return { valid: true, credits, code };
  }

  /** Mark a PIN as used */
  static usePin(pin) {
    const digits = pin.replace(/\D/g, '');
    const used = JSON.parse(localStorage.getItem('snap-usedPins') || '[]');
    used.push(digits);
    localStorage.setItem('snap-usedPins', JSON.stringify(used));
  }

  /** Get current credit balance */
  static getBalance() {
    return parseInt(localStorage.getItem('snapCredits') || '0');
  }

  /** Add credits */
  static addCredits(n) {
    const current = this.getBalance();
    localStorage.setItem('snapCredits', String(current + n));
    this._trackDispensed(n);
  }

  /** Spend 1 credit for a print. Returns true if successful. */
  static spendCredit() {
    const bal = this.getBalance();
    if (bal <= 0) return false;
    localStorage.setItem('snapCredits', String(bal - 1));
    this._trackPrint();
    return true;
  }

  /** Generate a valid PIN (for admin use) */
  static generatePin(credits) {
    const codeMap = { 1: '01', 2: '02', 5: '05', 10: '10' };
    const code = codeMap[credits] || '01';
    let base = code + Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      let d = parseInt(base[base.length - 1 - i]);
      if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    const check = (10 - (sum % 10)) % 10;
    const full = base + check;
    return `${full.slice(0, 5)}-${full.slice(5)}`;
  }

  /** Stats tracking */
  static _trackPrint() {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('snap-stats') || '{}');
    if (stats.date !== today) { stats.date = today; stats.prints = 0; }
    stats.prints = (stats.prints || 0) + 1;
    localStorage.setItem('snap-stats', JSON.stringify(stats));
  }

  static _trackDispensed(n) {
    const stats = JSON.parse(localStorage.getItem('snap-stats') || '{}');
    stats.dispensed = (stats.dispensed || 0) + n;
    localStorage.setItem('snap-stats', JSON.stringify(stats));
  }

  static getStats() {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('snap-stats') || '{}');
    const usedPins = JSON.parse(localStorage.getItem('snap-usedPins') || '[]');
    return {
      printsToday: (stats.date === today ? stats.prints : 0) || 0,
      creditsDispensed: stats.dispensed || 0,
      usedPinCount: usedPins.length,
    };
  }

  static clearUsedPins() {
    localStorage.removeItem('snap-usedPins');
  }
}

// ─── Payment UI ───────────────────────────────────────────────────────────────

class PaymentUI {
  constructor() {
    this.modal = document.getElementById('paymentModal');
    this.pinDisplay = document.getElementById('pinDisplay');
    this.pinError = document.getElementById('pinError');
    this.creditsDisplay = document.getElementById('creditsCount');
    this._pin = '';
    this._bindKeys();
    this._updateCreditsDisplay();
  }

  _bindKeys() {
    document.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.key;
        if (val === 'back') {
          this._pin = this._pin.slice(0, -1);
        } else if (this._pin.replace(/-/g, '').length < 10) {
          this._pin += val;
        }
        this._renderPin();
      });
    });

    const validateBtn = document.getElementById('validatePinBtn');
    if (validateBtn) validateBtn.addEventListener('click', () => this._validate());

    const closeBtn = document.getElementById('closePaymentBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

    const attendantBtn = document.getElementById('attendantBtn');
    if (attendantBtn) attendantBtn.addEventListener('click', () => AdminPanel.promptAttendantOverride());
  }

  _renderPin() {
    const raw = this._pin.replace(/\D/g, '').slice(0, 10);
    const part1 = raw.slice(0, 5).padEnd(5, '_');
    const part2 = raw.slice(5, 10).padEnd(5, '_');
    if (this.pinDisplay) this.pinDisplay.textContent = `${part1}-${part2}`;
  }

  _validate() {
    const pinStr = this._pin.replace(/\D/g, '').slice(0, 10);
    const formatted = `${pinStr.slice(0, 5)}-${pinStr.slice(5)}`;
    const result = PaymentSystem.decodePin(formatted);
    if (result.valid) {
      PaymentSystem.usePin(formatted);
      PaymentSystem.addCredits(result.credits);
      this._updateCreditsDisplay();
      this._showSuccess(`+${result.credits} credit${result.credits !== 1 ? 's' : ''} added!`);
      setTimeout(() => this.hide(), 1500);
    } else {
      this._showError(result.error);
    }
  }

  _showError(msg) {
    if (this.pinError) {
      this.pinError.textContent = msg;
      this.pinError.style.display = 'block';
    }
    if (this.pinDisplay) {
      this.pinDisplay.classList.add('shake');
      setTimeout(() => this.pinDisplay.classList.remove('shake'), 500);
    }
    this._pin = '';
    this._renderPin();
  }

  _showSuccess(msg) {
    if (this.pinError) {
      this.pinError.textContent = msg;
      this.pinError.style.color = '#00ff00';
      this.pinError.style.display = 'block';
    }
  }

  _updateCreditsDisplay() {
    const bal = PaymentSystem.getBalance();
    document.querySelectorAll('[data-credits-display]').forEach(el => {
      el.textContent = bal;
    });
    if (this.creditsDisplay) this.creditsDisplay.textContent = bal;
  }

  show() {
    this._pin = '';
    this._renderPin();
    if (this.pinError) { this.pinError.style.display = 'none'; this.pinError.style.color = '#ff4444'; }
    if (this.modal) this.modal.classList.add('active');
  }

  hide() {
    if (this.modal) this.modal.classList.remove('active');
  }
}

// Export for use in other scripts
window.PaymentSystem = PaymentSystem;
window.PaymentUI = PaymentUI;
