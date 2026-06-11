// Node-side export tests — SVG structure and ground-truth coordinates.
// The grid is 109.4 × 83 mm — the exact image area measured on an original
// Snap Station hagaki print, so these numbers are physical ground truth.
const { test, expect } = require('@playwright/test');
const StickerExport = require('../js/sticker-export.js');

test.describe('Cut SVG export', () => {
  test('cut-only SVG: 16 kiss-cut paths, mm-dimensioned, no image layer', () => {
    const svg = StickerExport.buildCutSvg({ paperId: '4x6' });
    expect(svg).toContain('width="152.4mm"');
    expect(svg).toContain('height="101.6mm"');
    expect(svg).toContain('viewBox="0 0 152.4 101.6"');
    expect(svg).toContain('inkscape:label="Cut"');
    expect(svg).not.toContain('print-layer');
    expect(svg).not.toContain('reg-layer');
    // one rounded-rect subpath per cell
    const d = svg.match(/<path d="([^"]+)"/)[1];
    expect(d.match(/M /g)).toHaveLength(16);
    expect(d.match(/Z/g)).toHaveLength(16);
  });

  test('first kiss-cut path starts at the ground-truth coordinate', () => {
    // 4x6: marginL = (152.4 − 109.4)/2 = 21.5; marginT = (101.6 − 83)/2 = 9.3
    // first cut x = 21.5 + 1.25 + r(2.75) = 25.5 ; y = 9.3 + 0.833 = 10.133
    const svg = StickerExport.buildCutSvg({ paperId: '4x6' });
    const d = svg.match(/<path d="([^"]+)"/)[1];
    expect(d.startsWith('M 25.5 10.133 ')).toBe(true);
  });

  test('embedded print layer sits under the cut layer', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/TEST';
    const svg = StickerExport.buildCutSvg({ paperId: '4x6', imageDataUrl: dataUrl });
    expect(svg).toContain('print-layer');
    expect(svg).toContain('href="' + dataUrl + '"');
    expect(svg).toContain('preserveAspectRatio="none"');
    expect(svg.indexOf('print-layer')).toBeLessThan(svg.indexOf('cut-layer'));
    // image spans the full paper so raster and cuts share one coordinate system
    expect(svg).toContain('<image x="0" y="0" width="152.4" height="101.6"');
  });

  test('registration marks: 4 corner crosses when requested', () => {
    const svg = StickerExport.buildCutSvg({ paperId: 'hagaki', registrationMarks: true });
    expect(svg).toContain('reg-layer');
    const crosses = svg.match(/stroke="#ff0000"/g);
    expect(crosses).toHaveLength(4);
  });

  test('letter paper scales the cuts by 2.2', () => {
    const svg = StickerExport.buildCutSvg({ paperId: 'letter' });
    expect(svg).toContain('width="279.4mm"');
    const d = svg.match(/<path d="([^"]+)"/)[1];
    // marginL = (279.4 − 109.4·2.2)/2 = 19.36; first x = 19.36 + (1.25 + 2.75)·2.2 = 28.16
    // marginT = (215.9 − 83·2.2)/2 = 16.65;   first y = 16.65 + 0.833·2.2 = 18.4826 → 18.483
    expect(d.startsWith('M 28.16 18.483 ')).toBe(true);
  });

  test('hagaki: grid still 109.4 × 83 mm, centered', () => {
    const svg = StickerExport.buildCutSvg({ paperId: 'hagaki' });
    const d = svg.match(/<path d="([^"]+)"/)[1];
    // marginL = (148 − 109.4)/2 = 19.3; first x = 19.3 + 4 = 23.3
    // marginT = (100 − 83)/2 = 8.5;     first y = 8.5 + 0.833 = 9.333
    expect(d.startsWith('M 23.3 9.333 ')).toBe(true);
  });
});
