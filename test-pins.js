/**
 * test-pins.js — Pre-generated valid Luhn PINs for development/testing
 *
 * TEST PINS — valid Luhn checksums, for development only
 * DO NOT distribute these as real cards
 *
 * Generated with seed 42 and verified with the Luhn algorithm.
 * Format: XXXXX-XXXXX (10 digits, display with hyphen)
 *   Digits 1-2: credit tier (01=1, 02=2, 05=5, 10=10 prints)
 *   Digits 3-9: random entropy
 *   Digit 10: Luhn check digit
 */
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

// Flat list for convenience
export const ALL_TEST_PINS = Object.values(TEST_PINS).flat();
