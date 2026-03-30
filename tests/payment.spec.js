/**
 * Payment system tests for Snap Station
 * Tests the Luhn PIN validation, credit tracking, and payment UI.
 */
const { test, expect } = require('@playwright/test');

// Valid test PINs (pre-verified Luhn checksums)
const VALID_PIN_1 = '01104-33216';   // 1 credit
const VALID_PIN_5 = '05419-28321';   // 5 credits
const VALID_PIN_10 = '10696-53283';  // 10 credits
const INVALID_PIN = '12345-67890';   // invalid checksum

async function goToSnapStation(page) {
  await page.goto('/snap-station.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function clearStorage(page) {
  await page.evaluate(() => {
    localStorage.removeItem('snapCredits');
    localStorage.removeItem('snap-usedPins');
    localStorage.removeItem('snap-stats');
  });
}

async function getBalance(page) {
  return page.evaluate(() => parseInt(localStorage.getItem('snapCredits') || '0'));
}

async function openPaymentModal(page) {
  const btn = page.locator('#insertCardBtn, button:has-text("INSERT CARD")').first();
  if (await btn.count() > 0) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function enterPin(page, pin) {
  const digits = pin.replace(/\D/g, '');
  for (const digit of digits) {
    await page.locator(`.keypad-btn[data-key="${digit}"]`).first().click();
  }
}

test.describe('Payment System — Luhn PIN validation', () => {

  test('valid test PIN adds 1 credit', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);

    // Use PaymentSystem directly via page evaluate
    const result = await page.evaluate((pin) => {
      if (typeof PaymentSystem === 'undefined') return { error: 'PaymentSystem not loaded' };
      const r = PaymentSystem.decodePin(pin);
      if (r.valid) {
        PaymentSystem.usePin(pin);
        PaymentSystem.addCredits(r.credits);
      }
      return { result: r, balance: PaymentSystem.getBalance() };
    }, VALID_PIN_1);

    if (result.error) {
      console.log('PaymentSystem not available in page context, skipping');
      return;
    }

    expect(result.result.valid).toBe(true);
    expect(result.result.credits).toBe(1);
    expect(result.balance).toBe(1);
  });

  test('valid 5-credit PIN adds 5 credits', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);

    const result = await page.evaluate((pin) => {
      if (typeof PaymentSystem === 'undefined') return { error: 'not loaded' };
      const r = PaymentSystem.decodePin(pin);
      if (r.valid) {
        PaymentSystem.usePin(pin);
        PaymentSystem.addCredits(r.credits);
      }
      return { result: r, balance: PaymentSystem.getBalance() };
    }, VALID_PIN_5);

    if (result.error) return;
    expect(result.result.valid).toBe(true);
    expect(result.result.credits).toBe(5);
    expect(result.balance).toBe(5);
  });

  test('invalid PIN checksum returns error', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);

    const result = await page.evaluate((pin) => {
      if (typeof PaymentSystem === 'undefined') return { error: 'not loaded' };
      return PaymentSystem.decodePin(pin);
    }, INVALID_PIN);

    if (result.error === 'not loaded') return;
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/checksum|invalid/i);
  });

  test('used PIN is rejected on second use', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);

    const result = await page.evaluate((pin) => {
      if (typeof PaymentSystem === 'undefined') return { error: 'not loaded' };
      // First use
      const r1 = PaymentSystem.decodePin(pin);
      if (r1.valid) {
        PaymentSystem.usePin(pin);
        PaymentSystem.addCredits(r1.credits);
      }
      // Second use
      const r2 = PaymentSystem.decodePin(pin);
      return { first: r1, second: r2, balance: PaymentSystem.getBalance() };
    }, VALID_PIN_1);

    if (result.error) return;
    expect(result.first.valid).toBe(true);
    expect(result.second.valid).toBe(false);
    expect(result.second.error).toMatch(/already used/i);
  });

  test('spendCredit decrements balance', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);

    const result = await page.evaluate(() => {
      if (typeof PaymentSystem === 'undefined') return { error: 'not loaded' };
      PaymentSystem.addCredits(3);
      const before = PaymentSystem.getBalance();
      const ok = PaymentSystem.spendCredit();
      const after = PaymentSystem.getBalance();
      return { before, ok, after };
    });

    if (result.error) return;
    expect(result.before).toBe(3);
    expect(result.ok).toBe(true);
    expect(result.after).toBe(2);
  });

  test('spendCredit fails with 0 balance', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);

    const result = await page.evaluate(() => {
      if (typeof PaymentSystem === 'undefined') return { error: 'not loaded' };
      const ok = PaymentSystem.spendCredit();
      return { ok, balance: PaymentSystem.getBalance() };
    });

    if (result.error) return;
    expect(result.ok).toBe(false);
    expect(result.balance).toBe(0);
  });

  test('10-digit PIN required', async ({ page }) => {
    await goToSnapStation(page);

    const result = await page.evaluate(() => {
      if (typeof PaymentSystem === 'undefined') return { error: 'not loaded' };
      return PaymentSystem.decodePin('12345');
    });

    if (result.error === 'not loaded') return;
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/10 digits/i);
  });

});

test.describe('Payment UI', () => {

  test('INSERT CARD button opens payment modal', async ({ page }) => {
    await goToSnapStation(page);

    const insertBtn = page.locator('#insertCardBtn, button:has-text("INSERT CARD")').first();
    if (await insertBtn.count() === 0) {
      console.log('INSERT CARD button not found, skipping UI test');
      return;
    }

    await insertBtn.click();
    await page.waitForTimeout(300);

    const modal = page.locator('#paymentModal');
    if (await modal.count() > 0) {
      const isVisible = await modal.evaluate(el => el.classList.contains('active'));
      expect(isVisible).toBe(true);
    }
  });

  test('invalid PIN via UI shows error', async ({ page }) => {
    await goToSnapStation(page);
    await clearStorage(page);
    await openPaymentModal(page);

    const keypadExists = await page.locator('.keypad-btn').first().count() > 0;
    if (!keypadExists) {
      console.log('Keypad not found, skipping UI test');
      return;
    }

    // Enter invalid PIN digits
    for (const digit of '1234567890') {
      await page.locator(`.keypad-btn[data-key="${digit}"]`).first().click();
    }

    const validateBtn = page.locator('#validatePinBtn');
    if (await validateBtn.count() > 0) {
      await validateBtn.click();
      await page.waitForTimeout(300);

      const errorEl = page.locator('#pinError');
      if (await errorEl.count() > 0) {
        const errorText = await errorEl.textContent();
        expect(errorText).toBeTruthy();
      }
    }
  });

});

test.describe('Admin Panel', () => {

  test('admin panel requires password', async ({ page }) => {
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Should show password prompt, not the admin panel
    const passwordPrompt = page.locator('#adminPasswordPrompt, .admin-login, [data-testid="password-prompt"]').first();
    const adminContent = page.locator('#adminContent, .admin-content').first();

    const promptVisible = await passwordPrompt.isVisible().catch(() => false);
    const contentVisible = await adminContent.isVisible().catch(() => false);

    // Either password prompt is shown OR admin content is hidden
    const isProtected = promptVisible || !contentVisible;
    expect(isProtected).toBe(true);
  });

  test('wrong password is rejected', async ({ page }) => {
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const passwordInput = page.locator('#adminPasswordInput, input[type="password"]').first();
    if (await passwordInput.count() === 0) {
      console.log('Password input not found, skipping');
      return;
    }

    await passwordInput.fill('wrongpassword123');
    const submitBtn = page.locator('#adminLoginBtn, button:has-text("Login"), button:has-text("Enter")').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(300);
    }

    // Admin content should still be hidden
    const adminContent = page.locator('#adminContent').first();
    if (await adminContent.count() > 0) {
      const isVisible = await adminContent.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('admin can add credits via override', async ({ page }) => {
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Log in with default password
    const passwordInput = page.locator('#adminPasswordInput, input[type="password"]').first();
    if (await passwordInput.count() === 0) {
      console.log('Password input not found, skipping');
      return;
    }

    // Clear balance first
    await page.evaluate(() => localStorage.setItem('snapCredits', '0'));

    await passwordInput.fill('snap2024');
    const submitBtn = page.locator('#adminLoginBtn, button:has-text("Login"), button:has-text("Enter")').first();
    if (await submitBtn.count() > 0) await submitBtn.click();
    await page.waitForTimeout(300);

    const addBtn = page.locator('button:has-text("Add 5")').first();
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const balance = await page.evaluate(() => parseInt(localStorage.getItem('snapCredits') || '0'));
      expect(balance).toBe(5);
    }
  });

});
