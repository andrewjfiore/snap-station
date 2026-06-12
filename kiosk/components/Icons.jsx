// ======= Icons.jsx — SVG symbol defs transplanted verbatim from the design system =======
// (pokemon-snap-station-designsystem.html). Rendered once by <SvgDefs/>; every
// component references them via <Icon id="..."/> -> <use href="#...">.

const SNAP_SVG_DEFS = `<defs>
    <symbol id="pb" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M3 32 A29 29 0 0 1 61 32 Z" fill="#EE1515" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="#fff" stroke="#111" stroke-width="2"/>
    </symbol>
    <symbol id="pb-outline" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="rgba(255,255,255,0.4)" stroke="#8a8a8a" stroke-width="3"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#8a8a8a" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="rgba(255,255,255,0.6)" stroke="#8a8a8a" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="rgba(255,255,255,0.6)" stroke="#8a8a8a" stroke-width="2"/>
    </symbol>
    <symbol id="pb-gray" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#E8E2D2" stroke="#8a8a8a" stroke-width="3"/>
      <path d="M3 32 A29 29 0 0 1 61 32 Z" fill="#bcb6a6" stroke="#8a8a8a" stroke-width="3" stroke-linejoin="round"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#8a8a8a" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="#E8E2D2" stroke="#8a8a8a" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="#E8E2D2" stroke="#8a8a8a" stroke-width="2"/>
    </symbol>

    <!-- Great Ball (Blockbuster): red top + blue crescent band -->
    <symbol id="pb-great" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M3 32 A29 29 0 0 1 61 32 Z" fill="#C0272D" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M5 22 A28 28 0 0 1 59 22 L56 26 A26 26 0 0 0 8 26 Z" fill="#1F3F97"/>
      <path d="M20 14 L26 20 M26 20 L20 20 M26 20 L26 14" fill="none" stroke="#C0272D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 14 L38 20 M38 20 L44 20 M38 20 L38 14" fill="none" stroke="#C0272D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="#fff" stroke="#111" stroke-width="2"/>
    </symbol>

    <!-- Ultra Ball (N64 JP): black top + yellow H mark -->
    <symbol id="pb-ultra" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M3 32 A29 29 0 0 1 61 32 Z" fill="#1a1a1a" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M20 14 L20 28 M44 14 L44 28 M20 21 L44 21" fill="none" stroke="#EFCC3B" stroke-width="3" stroke-linecap="round"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="#fff" stroke="#111" stroke-width="2"/>
    </symbol>

    <!-- Master Ball (Arcade PSS): purple top + pink M + two dots -->
    <symbol id="pb-master" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M3 32 A29 29 0 0 1 61 32 Z" fill="#7A3A8C" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="18" cy="20" r="2.6" fill="#E85A97"/>
      <circle cx="46" cy="20" r="2.6" fill="#E85A97"/>
      <path d="M24 26 L26 14 L32 21 L38 14 L40 26" fill="none" stroke="#E85A97" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="#fff" stroke="#111" stroke-width="2"/>
    </symbol>

    <!-- Quick Ball (Nintendo Switch): cyan top + yellow speed chevrons -->
    <symbol id="pb-quick" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M3 32 A29 29 0 0 1 61 32 Z" fill="#00C3E3" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M14 22 L24 14 L24 20 L34 12 L34 18 L44 10" fill="none" stroke="#FFD62E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14 28 L50 18" fill="none" stroke="#FFD62E" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="3" y1="32" x2="61" y2="32" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="9.5" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="32" cy="32" r="3.5" fill="#fff" stroke="#111" stroke-width="2"/>
    </symbol>

    <!-- Flat shutter pokéballs (no radial gradient) -->
    <symbol id="shutter-pb" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#EE1515" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="14" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/>
    </symbol>
    <symbol id="shutter-pb-gray" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#EFEADA" stroke="#8a8a8a" stroke-width="3"/>
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#C2BBAA" stroke="#8a8a8a" stroke-width="3" stroke-linejoin="round"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="#8a8a8a" stroke-width="3"/>
      <circle cx="50" cy="50" r="14" fill="#EFEADA" stroke="#8a8a8a" stroke-width="3"/>
      <circle cx="50" cy="50" r="6" fill="#EFEADA" stroke="#8a8a8a" stroke-width="2.5"/>
    </symbol>

    <!-- Shutter-size variants for each theme -->
    <symbol id="shutter-pb-great" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#C0272D" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M8 34 A44 44 0 0 1 92 34 L88 40 A40 40 0 0 0 12 40 Z" fill="#1F3F97"/>
      <path d="M28 20 L36 28 M36 28 L28 28 M36 28 L36 20" fill="none" stroke="#C0272D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M72 20 L64 28 M64 28 L72 28 M64 28 L64 20" fill="none" stroke="#C0272D" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="14" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/>
    </symbol>
    <symbol id="shutter-pb-ultra" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#1a1a1a" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M30 22 L30 44 M70 22 L70 44 M30 33 L70 33" fill="none" stroke="#EFCC3B" stroke-width="4.5" stroke-linecap="round"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="14" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/>
    </symbol>
    <symbol id="shutter-pb-master" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#7A3A8C" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="28" cy="32" r="4" fill="#E85A97"/>
      <circle cx="72" cy="32" r="4" fill="#E85A97"/>
      <path d="M37 42 L40 22 L50 33 L60 22 L63 42" fill="none" stroke="#E85A97" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="14" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/>
    </symbol>
    <symbol id="shutter-pb-quick" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="#111" stroke-width="3"/>
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill="#00C3E3" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <path d="M22 34 L38 22 L38 32 L54 18 L54 28 L70 14" fill="none" stroke="#FFD62E" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 44 L78 28" fill="none" stroke="#FFD62E" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="4" y1="50" x2="96" y2="50" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="14" fill="#fff" stroke="#111" stroke-width="3"/>
      <circle cx="50" cy="50" r="6" fill="#fff" stroke="#111" stroke-width="2.5"/>
    </symbol>

    <!-- Icons -->
    <symbol id="i-camera" viewBox="0 0 24 24">
      <rect x="3" y="7.5" width="18" height="12" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 7.5 L10 5.5 L14 5.5 L15 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="12" cy="13.5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="13.5" r="1.2" fill="currentColor"/>
    </symbol>
    <symbol id="i-retake" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        d="M4 12a8 8 0 1 1 2.4 5.7 M4 19v-4h4"/>
    </symbol>
    <symbol id="i-nextpose" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"
        d="M5 15c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5v3H5z M6.3 8.2 7.8 12 M17.7 8.2 16.2 12 M10 14.5v.5 M14 14.5v.5 M12 16.8l-.8.8M12 16.8l.8.8"/>
    </symbol>
    <symbol id="i-print" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"
        d="M7 9V4h10v5 M5 9h14a1 1 0 0 1 1 1v6h-3v4H7v-4H4v-6a1 1 0 0 1 1-1z M9 14h6"/>
    </symbol>
    <symbol id="i-back" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"
        d="M15 6 9 12l6 6"/>
    </symbol>
    <symbol id="i-gear" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"
        d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z
           M19.4 13.5a7.6 7.6 0 0 0 0-3l1.6-1.2-1.6-2.7L17.5 7a7.6 7.6 0 0 0-2.6-1.5L14.4 3.5h-4.8L9.1 5.5A7.6 7.6 0 0 0 6.5 7L4.6 6.6 3 9.3l1.6 1.2a7.6 7.6 0 0 0 0 3L3 14.7l1.6 2.7 1.9-.4A7.6 7.6 0 0 0 9.1 18.5l.5 2h4.8l.5-2a7.6 7.6 0 0 0 2.6-1.5l1.9.4 1.6-2.7z"/>
    </symbol>
    <symbol id="i-trash" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"
        d="M4 7h16 M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M6 7l1 13h10l1-13 M10 11v6 M14 11v6"/>
    </symbol>
    <symbol id="i-info" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        d="M12 10.5v6 M12 7.8v.2"/>
    </symbol>
    <symbol id="i-check-circle" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
        d="M8 12.3l2.8 2.8L16 10"/>
    </symbol>
    <symbol id="i-warn" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"
        d="M12 3.5 2.8 19.5h18.4z M12 10v4.5 M12 16.5v.2"/>
    </symbol>
    <symbol id="i-sheet" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"
        d="M4 5h16v14H4z M4 12h16 M12 5v14"/>
    </symbol>
    <symbol id="i-x" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
        d="M6 6l12 12 M18 6 6 18"/>
    </symbol>
    <symbol id="i-heart" viewBox="0 0 24 24">
      <path fill="currentColor"
        d="M12 20s-7-4.2-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.8-7 10-7 10z"/>
    </symbol>
    <symbol id="i-crown" viewBox="0 0 24 24">
      <path fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"
        d="M3 8l4 3 5-6 5 6 4-3-2 10H5z"/>
    </symbol>
    <symbol id="i-spark" viewBox="0 0 24 24">
      <path fill="currentColor"
        d="M12 1.5 13.5 9 21 10.5 13.5 12 12 19.5 10.5 12 3 10.5 10.5 9z"/>
    </symbol>
    <symbol id="i-bang" viewBox="0 0 24 24">
      <path fill="currentColor"
        d="M11 5h2l-.3 9h-1.4zM12 17.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
    </symbol>
    <symbol id="i-target" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        d="M12 2v3 M12 19v3 M2 12h3 M19 12h3"/>
    </symbol>
    <symbol id="i-contrast" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="currentColor" d="M12 3a9 9 0 0 1 0 18z"/>
    </symbol>
    <symbol id="i-cc" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
        d="M10.2 10.5a2.3 2.3 0 0 0-3.7 1.8 2.3 2.3 0 0 0 3.7 1.8 M17.5 10.5a2.3 2.3 0 0 0-3.7 1.8 2.3 2.3 0 0 0 3.7 1.8"/>
    </symbol>
    <symbol id="i-rm" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"
        d="M7 8l2 2 M15 8l-2 2 M7 16l2-2 M15 16l-2-2"/>
      <path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 4l16 16"/>
    </symbol>

    <!-- Admin dashboard icons -->
    <symbol id="i-home" viewBox="0 0 24 24">
      <path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-users" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17" cy="9" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5 M15 20c0-2.5 1.8-4 4-4s4 1.3 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-dollar" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M15 8.5H10.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H9 M12 6v12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-box" viewBox="0 0 24 24">
      <path d="M4 8l8-4 8 4v9l-8 4-8-4z M4 8l8 4 8-4 M12 12v9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-monitor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 21h6 M12 17v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-bell" viewBox="0 0 24 24">
      <path d="M6 15V10a6 6 0 0 1 12 0v5l2 2H4z M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-clock" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-download" viewBox="0 0 24 24">
      <path d="M12 4v11 M7 11l5 5 5-5 M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-doc" viewBox="0 0 24 24">
      <path d="M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-question" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4 M12 17v.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-paper-stack" viewBox="0 0 24 24">
      <path d="M6 5h10l2 2v12H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M9 2h10l2 2v12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" opacity=".5"/>
    </symbol>
    <symbol id="i-ribbon" viewBox="0 0 24 24">
      <path d="M6 4h12v15l-3-2-3 2-3-2-3 2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-chev-down" viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-lock" viewBox="0 0 24 24">
      <rect x="4" y="10" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M6 10V7a6 6 0 0 1 12 0v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-silhouette" viewBox="0 0 64 96">
      <path d="M32 6a10 10 0 0 1 10 10c0 6-4 11-10 11s-10-5-10-11A10 10 0 0 1 32 6z M14 96c0-20 8-32 18-32s18 12 18 32z" fill="currentColor"/>
    </symbol>
    <symbol id="i-search" viewBox="0 0 24 24">
      <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14z M16 16l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-star" viewBox="0 0 24 24">
      <path d="M12 3l2.6 5.6 6 .6-4.5 4.1 1.3 6.1L12 16.6 6.6 19.4l1.3-6.1L3.4 9.2l6-.6z" fill="currentColor"/>
    </symbol>
    <symbol id="i-flag" viewBox="0 0 24 24">
      <path d="M5 4v17 M5 4h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-mail" viewBox="0 0 24 24">
      <path d="M3 6h18v12H3z M3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-phone" viewBox="0 0 24 24">
      <path d="M5 4h4l2 5-3 2c1 3 3 5 6 6l2-3 5 2v4c0 1-1 2-2 2A16 16 0 0 1 3 6c0-1 1-2 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 0 1 14-5 M20 4v5h-5 M20 12a8 8 0 0 1-14 5 M4 20v-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-plus" viewBox="0 0 24 24">
      <path d="M12 5v14 M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </symbol>
    <symbol id="i-edit" viewBox="0 0 24 24">
      <path d="M4 20h4l11-11-4-4L4 16zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-wifi" viewBox="0 0 24 24">
      <path d="M2 9a16 16 0 0 1 20 0 M5 13a11 11 0 0 1 14 0 M8 17a6 6 0 0 1 8 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="12" cy="20" r="1.4" fill="currentColor"/>
    </symbol>
    <symbol id="i-card-reader" viewBox="0 0 24 24">
      <path d="M4 6h16v12H4z M4 10h16 M7 14h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-printer-machine" viewBox="0 0 24 24">
      <path d="M6 4h12v6H6z M4 10h16v8h-3v-4H7v4H4z M7 18h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-dispenser" viewBox="0 0 24 24">
      <path d="M5 4h14v6H5z M7 10v8c0 1 1 2 2 2h6c1 0 2-1 2-2v-8 M9 14h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-check" viewBox="0 0 24 24">
      <path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </symbol>
    <symbol id="i-share" viewBox="0 0 24 24">
      <circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="18" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="18" cy="18" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M8 11l8-4 M8 13l8 4" fill="none" stroke="currentColor" stroke-width="1.8"/>
    </symbol>
    <symbol id="i-sparkle" viewBox="0 0 24 24">
      <path d="M12 2L13 10 21 12 13 14 12 22 11 14 3 12 11 10z" fill="currentColor"/>
    </symbol>
  </defs>`;

function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"
         dangerouslySetInnerHTML={{ __html: SNAP_SVG_DEFS }} />
  );
}

// Generic <use> icon. Size/stroke come from the design-system CSS of the parent.
function Icon({ id, className, style }) {
  return (
    <svg className={className} style={style} aria-hidden="true" focusable="false">
      <use href={'#' + id} />
    </svg>
  );
}

window.SvgDefs = SvgDefs;
window.Icon = Icon;

// ---- Wizard hero illustrations (transplanted verbatim) ----
const WIZ_ART = {
  layout: `<svg class="wiz-hero__art" viewBox="0 0 124 96" fill="none">
            <!-- back card (purple) -->
            <g transform="translate(20 22) rotate(-12 30 22)">
              <rect width="60" height="44" rx="6" fill="#E2D0FF" stroke="#fff" stroke-width="2.5"/>
              <rect x="6" y="6" width="48" height="32" rx="3" fill="url(#heroPurpleGrad)"/>
              <circle cx="44" cy="14" r="4" fill="#FFD96B"/>
              <path d="M10 32 L20 22 L30 30 L42 18 L52 32 Z" fill="#A88BFF"/>
            </g>
            <!-- front card (blue) -->
            <g transform="translate(48 28) rotate(6 30 22)">
              <rect width="60" height="44" rx="6" fill="#C7D8FF" stroke="#fff" stroke-width="2.5"/>
              <rect x="6" y="6" width="48" height="32" rx="3" fill="url(#heroBlueGrad)"/>
              <circle cx="44" cy="14" r="4" fill="#FFD96B"/>
              <path d="M10 32 L22 18 L32 28 L42 16 L52 32 Z" fill="#7B9BE6"/>
            </g>
            <!-- sparkles -->
            <path d="M14 12 L16 18 L22 20 L16 22 L14 28 L12 22 L6 20 L12 18 Z" fill="#FFCB05"/>
            <path d="M108 56 L110 60 L114 62 L110 64 L108 68 L106 64 L102 62 L106 60 Z" fill="#FFCB05"/>
            <circle cx="100" cy="20" r="2.5" fill="#FFCB05"/>
            <circle cx="22" cy="78" r="2" fill="#FFCB05"/>
            <defs>
              <linearGradient id="heroPurpleGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#F0DDFF"/>
                <stop offset="1" stop-color="#D4B3FF"/>
              </linearGradient>
              <linearGradient id="heroBlueGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#DCE7FF"/>
                <stop offset="1" stop-color="#A3B8FF"/>
              </linearGradient>
            </defs>
          </svg>`,
  photos: `<svg class="wiz-hero__art" viewBox="0 0 124 96" fill="none">
              <!-- camera body -->
              <rect x="20" y="30" width="84" height="56" rx="8" fill="url(#camBody)" stroke="#7A5CFF" stroke-width="2"/>
              <rect x="44" y="22" width="28" height="14" rx="3" fill="#7A5CFF"/>
              <circle cx="62" cy="58" r="18" fill="#fff" stroke="#7A5CFF" stroke-width="2"/>
              <circle cx="62" cy="58" r="11" fill="#A88BFF"/>
              <circle cx="58" cy="54" r="3.5" fill="#fff"/>
              <circle cx="92" cy="44" r="3" fill="#FF6B9C"/>
              <!-- sparkles -->
              <path d="M14 18 L16 24 L22 26 L16 28 L14 34 L12 28 L6 26 L12 24 Z" fill="#FFCB05"/>
              <path d="M108 18 L110 22 L114 24 L110 26 L108 30 L106 26 L102 24 L106 22 Z" fill="#FFCB05"/>
              <circle cx="20" cy="80" r="2.5" fill="#FFCB05"/>
              <defs>
                <linearGradient id="camBody" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#F0E8FF"/>
                  <stop offset="1" stop-color="#D4B3FF"/>
                </linearGradient>
              </defs>
            </svg>`,
  decorate: `<svg class="wiz-hero__art" viewBox="0 0 124 96" fill="none">
              <!-- photo card backdrop -->
              <rect x="22" y="20" width="80" height="60" rx="8" fill="url(#decPhoto)" stroke="#fff" stroke-width="2.5"/>
              <rect x="28" y="26" width="68" height="48" rx="4" fill="url(#decPhotoInner)"/>
              <!-- sticker overlays on the photo -->
              <text x="40" y="50" font-size="22" text-anchor="middle">⚡</text>
              <text x="84" y="44" font-size="20" text-anchor="middle">⭐</text>
              <text x="50" y="72" font-size="18" text-anchor="middle">🌸</text>
              <text x="86" y="70" font-size="16" text-anchor="middle">✨</text>
              <!-- floating sparkles -->
              <path d="M12 12 L14 18 L20 20 L14 22 L12 28 L10 22 L4 20 L10 18 Z" fill="#FFCB05"/>
              <path d="M110 64 L112 68 L116 70 L112 72 L110 76 L108 72 L104 70 L108 68 Z" fill="#FFCB05"/>
              <circle cx="14" cy="80" r="2.5" fill="#FF6B9C"/>
              <circle cx="112" cy="22" r="2.5" fill="#FF6B9C"/>
              <defs>
                <linearGradient id="decPhoto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#fff"/>
                  <stop offset="1" stop-color="#F8F0FF"/>
                </linearGradient>
                <linearGradient id="decPhotoInner" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#FFE0B2"/>
                  <stop offset=".5" stop-color="#C7D8FF"/>
                  <stop offset="1" stop-color="#C7F0D8"/>
                </linearGradient>
              </defs>
            </svg>`,
  preview: `<svg class="wiz-hero__art" viewBox="0 0 124 96" fill="none">
            <!-- sheet (4x6 landscape, gridded) -->
            <rect x="20" y="20" width="84" height="56" rx="6" fill="#fff" stroke="#7A5CFF" stroke-width="2.5"/>
            <rect x="26" y="26" width="36" height="20" rx="2" fill="#FFE0B2"/>
            <rect x="66" y="26" width="32" height="20" rx="2" fill="#C7D8FF"/>
            <rect x="26" y="50" width="36" height="20" rx="2" fill="#C7F0D8"/>
            <rect x="66" y="50" width="32" height="20" rx="2" fill="#FFD1D6"/>
            <!-- success check badge -->
            <circle cx="100" cy="20" r="14" fill="#2E7D32" stroke="#fff" stroke-width="3"/>
            <path d="M93 20 L98 25 L107 16" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- sparkles -->
            <path d="M14 60 L16 66 L22 68 L16 70 L14 76 L12 70 L6 68 L12 66 Z" fill="#FFCB05"/>
            <circle cx="20" cy="86" r="2.5" fill="#FF6B9C"/>
          </svg>`,
  print: `<svg class="wiz-hero__art" viewBox="0 0 124 96" fill="none">
            <!-- printer body -->
            <rect x="20" y="36" width="84" height="40" rx="6" fill="url(#prFace)" stroke="#7a7460" stroke-width="2"/>
            <rect x="30" y="22" width="64" height="20" rx="4" fill="#EEE7D3" stroke="#7a7460" stroke-width="2"/>
            <rect x="32" y="60" width="60" height="3" rx="1" fill="#222"/>
            <circle cx="32" cy="48" r="2.5" fill="#FFCB05"/>
            <circle cx="40" cy="48" r="2.5" fill="#2E7D32"/>
            <!-- emerging sheet -->
            <rect x="34" y="64" width="56" height="22" rx="2" fill="#fff" stroke="#7a7460" stroke-width="1.5"/>
            <rect x="38" y="68" width="22" height="6" rx="1" fill="#FFE0B2"/>
            <rect x="64" y="68" width="22" height="6" rx="1" fill="#C7D8FF"/>
            <rect x="38" y="76" width="22" height="6" rx="1" fill="#C7F0D8"/>
            <rect x="64" y="76" width="22" height="6" rx="1" fill="#FFD1D6"/>
            <!-- sparkles -->
            <path d="M14 26 L16 30 L20 32 L16 34 L14 38 L12 34 L8 32 L12 30 Z" fill="#FFCB05"/>
            <path d="M108 28 L110 32 L114 34 L110 36 L108 40 L106 36 L102 34 L106 32 Z" fill="#FFCB05"/>
            <defs>
              <linearGradient id="prFace" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#D9D3C7"/>
                <stop offset="1" stop-color="#B8B2A4"/>
              </linearGradient>
            </defs>
          </svg>`,
};
const CP_PRINTER_ART = `<svg class="cp-printer__svg" viewBox="0 0 280 240" fill="none">
            <!-- side sparkles -->
            <path class="cp-printer__sparkle" d="M28 60 L32 70 L42 74 L32 78 L28 88 L24 78 L14 74 L24 70 Z" fill="#FFCB05"/>
            <path class="cp-printer__sparkle cp-printer__sparkle--b" d="M250 130 L254 138 L262 142 L254 146 L250 154 L246 146 L238 142 L246 138 Z" fill="#FFCB05"/>
            <!-- lid -->
            <rect x="80" y="40" width="120" height="28" rx="6" fill="#EEE7D3" stroke="#7a7460" stroke-width="2.5"/>
            <!-- body -->
            <rect x="60" y="68" width="160" height="100" rx="14" fill="url(#cpBody)" stroke="#7a7460" stroke-width="2.5"/>
            <!-- panel screen -->
            <rect x="86" y="92" width="64" height="24" rx="4" fill="#1f3eaf"/>
            <rect x="92" y="98" width="48" height="3" rx="1" fill="#FFD96B"/>
            <rect x="92" y="104" width="32" height="3" rx="1" fill="#92dcb1"/>
            <rect x="92" y="110" width="40" height="2" rx="1" fill="#A3B8FF"/>
            <!-- LED -->
            <circle class="cp-printer__led" cx="170" cy="104" r="6" fill="#2E7D32"/>
            <!-- physical buttons -->
            <circle cx="186" cy="104" r="4" fill="#1a1a1a"/>
            <circle cx="200" cy="104" r="4" fill="#1a1a1a"/>
            <!-- output slot -->
            <rect x="86" y="158" width="108" height="6" rx="1" fill="#1a1a1a"/>
            <!-- sheet emerging -->
            <g class="cp-printer__paper">
              <rect x="100" y="148" width="80" height="48" rx="3" fill="#fff" stroke="#7a7460" stroke-width="1.5"/>
              <rect x="106" y="154" width="32" height="16" rx="2" fill="#FFE0B2"/>
              <rect x="142" y="154" width="32" height="16" rx="2" fill="#C7D8FF"/>
              <rect x="106" y="174" width="32" height="16" rx="2" fill="#C7F0D8"/>
              <rect x="142" y="174" width="32" height="16" rx="2" fill="#FFD1D6"/>
              <text x="118" y="166" font-size="12" text-anchor="middle">⚡</text>
              <text x="158" y="166" font-size="12" text-anchor="middle">⭐</text>
              <text x="120" y="187" font-size="11" text-anchor="middle">🌸</text>
              <text x="158" y="187" font-size="11" text-anchor="middle">✨</text>
            </g>
            <!-- feet -->
            <rect x="74" y="168" width="14" height="6" rx="2" fill="#7a7460"/>
            <rect x="192" y="168" width="14" height="6" rx="2" fill="#7a7460"/>
            <defs>
              <linearGradient id="cpBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#D9D3C7"/>
                <stop offset="1" stop-color="#B8B2A4"/>
              </linearGradient>
            </defs>
          </svg>`;
window.WIZ_ART = WIZ_ART;
window.CP_PRINTER_ART = CP_PRINTER_ART;
