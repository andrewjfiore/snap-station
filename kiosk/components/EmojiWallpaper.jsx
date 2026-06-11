// Scattered emoji wallpaper — original snap-station signature.
// Generates N emoji deterministically (seeded) so it doesn't reshuffle on re-render.

function seeded(n) {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function EmojiWallpaper({ wallpaperId = 'none', customEmoji = '', count = 80, seed = 7 }) {
  const wp = SHEET_WALLPAPERS.find(w => w.id === wallpaperId);
  let emoji = wp ? wp.emoji : [];
  if (wallpaperId === 'custom' && customEmoji) {
    // split into grapheme-ish chunks
    emoji = Array.from(customEmoji).filter(c => c.trim());
    if (emoji.length === 0) emoji = [customEmoji];
  }

  // NOTE: hooks must run unconditionally — the prototype early-returned before
  // this useMemo, which breaks React's hook order when wallpapers toggle.
  const emojiKey = emoji.join('');
  const rnd = useMemo(() => {
    if (emoji.length === 0) return [];
    const r = seeded(seed);
    return Array.from({length: count}, (_, i) => ({
      key: i,
      emoji: emoji[Math.floor(r() * emoji.length)],
      left: r() * 100,
      top: r() * 100,
      size: 16 + r() * 22,
      delay: r() * 8,
      drift: (r() * 2 - 1) * 12,
    }));
  }, [wallpaperId, customEmoji, emojiKey, count, seed]);

  if (!emoji || emoji.length === 0) return null;

  return (
    <div className="emoji-wallpaper" aria-hidden="true">
      {rnd.map(e => (
        <span key={e.key}
              style={{
                left: `${e.left}%`,
                top: `${e.top}%`,
                fontSize: `${e.size}px`,
                animationDelay: `${e.delay}s`,
                '--drift': `${e.drift}px`,
              }}>
          {e.emoji}
        </span>
      ))}
    </div>
  );
}
window.EmojiWallpaper = EmojiWallpaper;
