// @ts-check
// Pixel-parity against the snap-station-emu reference harness. Skips if
// the sibling checkout is not present; never fails the suite for missing
// infrastructure.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EMU_DIR = path.resolve(__dirname, '..', '..', 'snap-station-emu');
const HARNESS = path.join(EMU_DIR, 'emu', 'harness', 'run_script.py');
const GOLDEN_DIR = path.join(EMU_DIR, 'emu', 'harness', 'golden_images');

test.describe('compositor parity vs. snap-station-emu', () => {
    test.skip(!fs.existsSync(HARNESS),
        'snap-station-emu sibling checkout not present');

    test('title_to_print golden hashes present after pin', async () => {
        const scenario = path.join(
            EMU_DIR, 'emu', 'harness', 'scenarios', 'title_to_print.yaml');
        if (!fs.existsSync(scenario)) test.skip();
        const out = execFileSync('python3',
            [HARNESS, scenario, '--track=ares'],
            { cwd: EMU_DIR, encoding: 'utf8' });
        expect(out).toContain('OK');
    });

    test('golden image directory is populated', async () => {
        if (!fs.existsSync(GOLDEN_DIR)) test.skip();
        const entries = fs.readdirSync(GOLDEN_DIR);
        // At minimum the README; pins land as additional files.
        expect(entries).toContain('README.md');
    });
});
