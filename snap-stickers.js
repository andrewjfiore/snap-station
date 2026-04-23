/* snap-stickers.js
 *
 * Redesigned sticker library: colorful, child-appealing, full-color,
 * not themed to any single scene. SVG strings inlined to avoid a binary
 * asset tree; the kiosk rasterizes them deterministically for the
 * sticker-sheet compositor.
 *
 * Add new stickers by appending to STICKERS with a unique id. Tests
 * assert the library is non-empty and that every entry round-trips
 * through DOM parsing, so typos break CI.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SnapStickers = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function svg(body) {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + body + '</svg>';
    }

    var STICKERS = [
        {
            id: 'bolt',
            label: 'Lightning Bolt',
            palette: ['#FFD700', '#FFA500'],
            svg: svg(
                '<polygon points="55,5 25,55 45,55 35,95 75,45 55,45 65,5" ' +
                'fill="#FFD700" stroke="#B87A00" stroke-width="3" stroke-linejoin="round"/>'
            )
        },
        {
            id: 'flower',
            label: 'Daisy',
            palette: ['#FFFFFF', '#FFD700', '#FF69B4'],
            svg: svg(
                '<g stroke="#B87A00" stroke-width="2">' +
                '<circle cx="50" cy="25" r="14" fill="#FFFFFF"/>' +
                '<circle cx="75" cy="50" r="14" fill="#FFFFFF"/>' +
                '<circle cx="50" cy="75" r="14" fill="#FFFFFF"/>' +
                '<circle cx="25" cy="50" r="14" fill="#FFFFFF"/>' +
                '<circle cx="50" cy="50" r="14" fill="#FFD700"/>' +
                '</g>'
            )
        },
        {
            id: 'pokeball',
            label: 'Poké Ball',
            palette: ['#EE1515', '#FFFFFF', '#222222'],
            svg: svg(
                '<circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#222" stroke-width="4"/>' +
                '<path d="M 8,50 A 42,42 0 0 1 92,50 Z" fill="#EE1515" stroke="#222" stroke-width="4"/>' +
                '<rect x="8" y="47" width="84" height="6" fill="#222"/>' +
                '<circle cx="50" cy="50" r="10" fill="#FFFFFF" stroke="#222" stroke-width="4"/>' +
                '<circle cx="50" cy="50" r="4" fill="#222"/>'
            )
        },
        {
            id: 'rainbow',
            label: 'Rainbow',
            palette: ['#FF0000', '#FFA500', '#FFD700', '#00AA44', '#0066FF', '#8A2BE2'],
            svg: svg(
                '<g fill="none" stroke-width="9" stroke-linecap="round">' +
                '<path d="M 10,85 A 40,40 0 0 1 90,85" stroke="#FF0000"/>' +
                '<path d="M 20,85 A 30,30 0 0 1 80,85" stroke="#FFA500"/>' +
                '<path d="M 30,85 A 20,20 0 0 1 70,85" stroke="#00AA44"/>' +
                '<path d="M 40,85 A 10,10 0 0 1 60,85" stroke="#0066FF"/>' +
                '</g>'
            )
        },
        {
            id: 'star',
            label: 'Star',
            palette: ['#FFD700'],
            svg: svg(
                '<polygon points="50,8 61,40 95,40 68,60 78,92 50,72 22,92 32,60 5,40 39,40" ' +
                'fill="#FFD700" stroke="#B87A00" stroke-width="3" stroke-linejoin="round"/>'
            )
        },
        {
            id: 'heart',
            label: 'Heart',
            palette: ['#FF1493'],
            svg: svg(
                '<path d="M 50,85 C 10,60 10,25 30,20 C 42,17 50,27 50,35 ' +
                'C 50,27 58,17 70,20 C 90,25 90,60 50,85 Z" ' +
                'fill="#FF1493" stroke="#8B0A4A" stroke-width="3" stroke-linejoin="round"/>'
            )
        },
        {
            id: 'smiley',
            label: 'Smiley',
            palette: ['#FFD700', '#222222'],
            svg: svg(
                '<circle cx="50" cy="50" r="42" fill="#FFD700" stroke="#B87A00" stroke-width="3"/>' +
                '<circle cx="35" cy="40" r="5" fill="#222"/>' +
                '<circle cx="65" cy="40" r="5" fill="#222"/>' +
                '<path d="M 30,58 Q 50,78 70,58" fill="none" stroke="#222" stroke-width="4" stroke-linecap="round"/>'
            )
        },
        {
            id: 'cassette',
            label: 'Cassette',
            palette: ['#003791', '#FFD700', '#FFFFFF'],
            svg: svg(
                '<rect x="10" y="25" width="80" height="50" rx="6" ' +
                'fill="#003791" stroke="#FFD700" stroke-width="3"/>' +
                '<rect x="20" y="35" width="60" height="16" fill="#FFFFFF"/>' +
                '<circle cx="32" cy="62" r="6" fill="#FFD700"/>' +
                '<circle cx="68" cy="62" r="6" fill="#FFD700"/>' +
                '<circle cx="32" cy="62" r="2" fill="#003791"/>' +
                '<circle cx="68" cy="62" r="2" fill="#003791"/>'
            )
        }
    ];

    function list() { return STICKERS.slice(); }

    function byId(id) {
        for (var i = 0; i < STICKERS.length; i++) {
            if (STICKERS[i].id === id) return STICKERS[i];
        }
        return null;
    }

    function toDataUrl(sticker) {
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(sticker.svg);
    }

    return {
        list: list,
        byId: byId,
        toDataUrl: toDataUrl,
        count: STICKERS.length
    };
}));
