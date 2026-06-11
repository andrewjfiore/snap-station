// Node-side geometry tests — no browser. The sticker sheet's physical dimensions
// are load-bearing: printing and kiss-cutting depend on them exactly.
const { test, expect } = require('@playwright/test');
const C = require('../js/sticker-constants.js');

test.describe('Sticker geometry constants', () => {
  test('kiss-cut dimensions match the reference diagram', () => {
    expect(C.STICKER_DIMS.STK_W).toBe(26.6);
    expect(C.STICKER_DIMS.STK_H).toBe(20);
    expect(C.STICKER_DIMS.GAP).toBe(1);
    expect(C.STICKER_DIMS.KISS_INNER_W).toBe(24.1);
    expect(C.STICKER_DIMS.KISS_INNER_H).toBe(17.5);
    expect(C.STICKER_DIMS.KISS_R).toBe(2.75);
  });

  test('paper sizes match physical media', () => {
    const byId = Object.fromEntries(C.PAPER_SIZES.map(p => [p.id, p]));
    expect(byId['4x6']).toMatchObject({ w: 152.4, h: 101.6, scale: 1.0 });
    expect(byId['hagaki']).toMatchObject({ w: 148, h: 100, scale: 1.0 });
    expect(byId['letter']).toMatchObject({ w: 279.4, h: 215.9, scale: 2.2 });
  });

  test('all papers are landscape', () => {
    for (const p of C.PAPER_SIZES) expect(p.w).toBeGreaterThan(p.h);
  });

  test('every layout maps exactly 16 cells with valid group indices', () => {
    for (const layout of C.SHEET_LAYOUTS) {
      expect(layout.mapping).toHaveLength(16);
      for (const g of layout.mapping) {
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThan(layout.groups);
      }
      // every group is used at least once
      expect(new Set(layout.mapping).size).toBe(layout.groups);
    }
  });

  for (const paper of ['4x6', 'hagaki', 'letter']) {
    for (const layout of ['single', 'quad', 'unique']) {
      test(`geometry ${paper}/${layout}: grid centered, cells inside paper, identical outer dims`, () => {
        const g = C.getSheetGeometry(paper, layout);
        const D = C.STICKER_DIMS;
        const s = g.paper.scale;

        // outer grid dimensions are layout-independent
        expect(g.grid.w).toBeCloseTo((D.STK_W * 4 + D.GAP * 3) * s, 6);
        expect(g.grid.h).toBeCloseTo((D.STK_H * 4 + D.GAP * 3) * s, 6);

        // centered on the paper
        expect(g.grid.marginL).toBeCloseTo((g.paper.w - g.grid.w) / 2, 6);
        expect(g.grid.marginT).toBeCloseTo((g.paper.h - g.grid.h) / 2, 6);
        expect(g.grid.marginL).toBeGreaterThan(0);
        expect(g.grid.marginT).toBeGreaterThan(0);

        expect(g.cells).toHaveLength(16);
        for (const cell of g.cells) {
          // cell inside paper
          expect(cell.x).toBeGreaterThanOrEqual(0);
          expect(cell.y).toBeGreaterThanOrEqual(0);
          expect(cell.x + cell.w).toBeLessThanOrEqual(g.paper.w + 1e-9);
          expect(cell.y + cell.h).toBeLessThanOrEqual(g.paper.h + 1e-9);
          // kiss-cut offset: 1.25 mm sides; 0.833 mm top / 1.667 mm bottom
          // (vertically asymmetric per the original reference diagram)
          expect(cell.kiss.x - cell.x).toBeCloseTo(1.25 * s, 6);
          expect(cell.kiss.y - cell.y).toBeCloseTo(0.833 * s, 6);
          expect((cell.y + cell.h) - (cell.kiss.y + cell.kiss.h)).toBeCloseTo(1.667 * s, 6);
          expect(cell.kiss.w).toBeCloseTo(D.KISS_INNER_W * s, 6);
          expect(cell.kiss.h).toBeCloseTo(D.KISS_INNER_H * s, 6);
          expect(cell.kiss.r).toBeCloseTo(D.KISS_R * s, 6);
        }

        // no two cells overlap
        for (let i = 0; i < 16; i++) {
          for (let j = i + 1; j < 16; j++) {
            const a = g.cells[i], b = g.cells[j];
            const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
            expect(overlap).toBe(false);
          }
        }
      });
    }
  }

  test('mm→px conversion at 300 DPI', () => {
    expect(C.mmToPx(25.4)).toBeCloseTo(300, 9);
    expect(C.mmToPx(152.4)).toBeCloseTo(1800, 9);
    expect(C.mmToPx(101.6)).toBeCloseTo(1200, 9);
  });
});
