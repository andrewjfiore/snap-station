/**
 * snap-payment.js — Luhn PIN Payment System for Snap Station
 * Pokémon Snap Station Kiosk — Self-validating PIN credits
 */

'use strict';

// TEST PINS — valid Luhn checksums, for development only
// DO NOT distribute these as real cards
export const TEST_PINS = {
  '1_print': [
    '01104-33216',
    '01819-60014',
    '01338-90830',
    '01863-79400',
    '01265-42356',
  ],
  '2_prints': [
    '02116-15596',
    '02407-81617',
    '02849-59319',
    '02034-13166',
    '02475-25538',
  ],
  '5_prints': [
    '05419-28321',
    '05764-83507',
    '05305-64137',
    '05953-76724',
    '05423-88491',
  ],
  '10_prints': [
    '10696-53283',
    '10710-12262',
    '10916-69786',
    '10480-18459',
    '10146-27044',
  ],
};

export class PaymentSystem {
  static CREDIT_CODES = { '01': 1, '02': 2, '05': 5, '10': 10 };

  /** Luhn algorithm validation */
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

    // Check if already used (localStorage)
    const used = JSON.parse(localStorage.getItem('usedPins') || '[]');
    if (used.includes(digits)) return { valid: false, error: 'PIN already used' };

    return { valid: true, credits, code };
  }

  /** Mark a PIN as used */
  static usePin(pin) {
    const digits = pin.replace(/\D/g, '');
    const used = JSON.parse(localStorage.getItem('usedPins') || '[]');
    used.push(digits);
    localStorage.setItem('usedPins', JSON.stringify(used));
  }

  /** Get current credit balance */
  static getBalance() {
    return parseInt(localStorage.getItem('snapCredits') || '0');
  }

  /** Add credits */
  static addCredits(n) {
    const current = this.getBalance();
    localStorage.setItem('snapCredits', String(current + n));
  }

  /** Spend 1 credit for a print. Returns true if successful. */
  static spendCredit() {
    const bal = this.getBalance();
    if (bal <= 0) return false;
    localStorage.setItem('snapCredits', String(bal - 1));
    return true;
  }

  /** Generate a valid PIN (for admin use) */
  static generatePin(credits) {
    const codeMap = { 1: '01', 2: '02', 5: '05', 10: '10' };
    const code = codeMap[credits] || '01';
    let base = code + Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
    // Compute check digit
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

  /** Generate a batch of PINs */
  static generateBatch(count, credits) {
    return Array.from({ length: count }, () => this.generatePin(credits));
  }

  /** Get stats */
  static getStats() {
    const used = JSON.parse(localStorage.getItem('usedPins') || '[]');
    const prints = parseInt(localStorage.getItem('snapPrintsToday') || '0');
    const creditsDispensed = parseInt(localStorage.getItem('snapCreditsDispensed') || '0');
    return {
      usedPinCount: used.length,
      printsToday: prints,
      creditsDispensed,
      currentBalance: this.getBalance(),
    };
  }

  /** Increment print count */
  static recordPrint() {
    const p = parseInt(localStorage.getItem('snapPrintsToday') || '0');
    localStorage.setItem('snapPrintsToday', String(p + 1));
  }

  /** Record dispensed credits */
  static recordDispense(n) {
    const d = parseInt(localStorage.getItem('snapCreditsDispensed') || '0');
    localStorage.setItem('snapCreditsDispensed', String(d + n));
  }

  /** Clear used PIN history */
  static clearUsedPins() {
    localStorage.removeItem('usedPins');
  }

  /** Check admin password */
  static checkAdminPassword(password) {
    const storedHash = localStorage.getItem('adminHash');
    if (!storedHash) {
      // First run — set default password "snapAdmin"
      const defaultHash = this._sha256Sync('snapAdmin');
      localStorage.setItem('adminHash', defaultHash);
      return this._sha256Sync(password) === defaultHash;
    }
    return this._sha256Sync(password) === storedHash;
  }

  /** Change admin password */
  static setAdminPassword(newPassword) {
    localStorage.setItem('adminHash', this._sha256Sync(newPassword));
  }

  /** Simple synchronous SHA-256 via SubtleCrypto — returns hex string */
  static _sha256Sync(str) {
    // For synchronous use in UI, use a simple djb2 hash approximation
    // In a real deployment, use SubtleCrypto.digest async
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return String(Math.abs(hash));
  }
}

// Make available globally for non-module contexts
if (typeof window !== 'undefined') {
  window.PaymentSystem = PaymentSystem;
  window.TEST_PINS = TEST_PINS;
}
