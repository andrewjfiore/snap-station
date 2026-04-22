/* snap-layouts.js
 *
 * Layout-agnostic geometry for the sticker sheet. Single source of truth
 * shared by snap-station.js (preview grid) and sticker-sheet.js (print
 * composer). Mirrors the constants in
 * snap-station-emu/src/sticker_sheet.c at 300 DPI.
 *
 * The three variants all share the same outer hagaki dimensions so any
 * one of them can be printed on the same paper stock. Sticker cell size
 * scales with grid density; this is a product decision, not a ROM
 * constraint (the original station captured composite video and never
 * encoded a layout).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapLayouts = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Millimetre constants verified against Andrew's 2023 measurements.
    // Do not drift from snap-station-emu/docs/ROM_SPEC.md section 4.
    var MM = {
        paperW: 148.0,
        paperH: 100.0,
        printW: 109.4,
        printH: 83.0,
        gutter: 1.0,
        cornerRadius: 2.75,
        cutInsetTop: 0.833,
        cutInsetBottom: 1.667,
        cutInsetSide: 1.25
    };

    var DPI_DEFAULT = 300;

    function mmToPx(mm, dpi) {
        return Math.round(mm / 25.4 * dpi);
    }

    function computeCells(cols, rows, dpi) {
        var d = dpi || DPI_DEFAULT;
        var printW = mmToPx(MM.printW, d);
        var printH = mmToPx(MM.printH, d);
        var gutter = mmToPx(MM.gutter, d);
        var cellW = Math.floor((printW - (cols - 1) * gutter) / cols);
        var cellH = Math.floor((printH - (rows - 1) * gutter) / rows);
        var insetTop = mmToPx(MM.cutInsetTop, d);
        var insetBot = mmToPx(MM.cutInsetBottom, d);
        var insetSide = mmToPx(MM.cutInsetSide, d);
        // Offset the grid inside the hagaki (margin = paper - print / 2).
        var marginX = mmToPx((MM.paperW - MM.printW) / 2, d);
        var marginY = mmToPx((MM.paperH - MM.printH) / 2, d);
        var cells = [];
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var x = marginX + c * (cellW + gutter);
                var y = marginY + r * (cellH + gutter);
                cells.push({
                    index: r * cols + c,
                    backing: { x: x, y: y, w: cellW, h: cellH },
                    cut: {
                        x: x + insetSide,
                        y: y + insetTop,
                        w: cellW - 2 * insetSide,
                        h: cellH - insetTop - insetBot,
                        radius: mmToPx(MM.cornerRadius, d)
                    }
                });
            }
        }
        return cells;
    }

    function getLayout(name, dpi) {
        var spec;
        switch (name) {
            case '4x4':   spec = { cols: 4, rows: 4 };  break;
            case '1x16':  spec = { cols: 1, rows: 16 }; break;
            case '16x1':  spec = { cols: 16, rows: 1 }; break;
            default:
                throw new Error('unknown layout ' + name);
        }
        var d = dpi || DPI_DEFAULT;
        return {
            name: name,
            cols: spec.cols,
            rows: spec.rows,
            count: spec.cols * spec.rows,
            dpi: d,
            sheetPx: {
                w: mmToPx(MM.paperW, d),
                h: mmToPx(MM.paperH, d)
            },
            sheetMm: { w: MM.paperW, h: MM.paperH },
            cells: computeCells(spec.cols, spec.rows, d)
        };
    }

    return {
        MM: MM,
        DPI_DEFAULT: DPI_DEFAULT,
        mmToPx: mmToPx,
        getLayout: getLayout,
        LAYOUTS: ['4x4', '1x16', '16x1'],
        DEFAULT: '4x4'
    };
}));
