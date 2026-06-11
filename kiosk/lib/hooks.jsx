// Shared hooks + helpers
const { useState, useEffect, useRef, useCallback, useMemo } = React;

function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const r = localStorage.getItem(key);
      return r ? JSON.parse(r) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key, v]);
  return [v, setV];
}

// Settings backed by SnapStore (ss.v1.settings) instead of the prototype's
// sk_tweaks localStorage blob. First boot seeds from window.__TWEAKS__ so the
// host's edit-mode defaults still apply; afterwards SnapStore is authoritative.
function useSettings() {
  const [settings, setState] = useState(() => {
    const hasStored = SnapStore.get('settings', null) !== null;
    if (!hasStored && window.__TWEAKS__) return SnapStore.setSettings(window.__TWEAKS__);
    return SnapStore.getSettings();
  });
  const setSettings = useCallback((patch) => {
    setState(SnapStore.setSettings(patch));
  }, []);
  return [settings, setSettings];
}

// Credits live in SnapStore only; this is a render mirror. All mutations go
// through SnapPayment / SnapStore, then call refresh().
function useCredits() {
  const [credits, setState] = useState(() => SnapStore.getCredits());
  const refresh = useCallback(() => setState(SnapStore.getCredits()), []);
  return [credits, refresh];
}

// Idle timeout: with no pointerdown/keydown (gamepad activity calls the returned
// reset()) for IDLE_MS the kiosk returns to attract. window.__IDLE_MS__ overrides
// the delay for tests.
const IDLE_MS_DEFAULT = 120000;
function useIdleTimeout(enabled, onIdle) {
  const onIdleRef = useRef(onIdle);
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);
  const resetRef = useRef(() => {});

  useEffect(() => {
    if (!enabled) { resetRef.current = () => {}; return; }
    let timer = null;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { onIdleRef.current?.(); },
        (typeof window.__IDLE_MS__ === 'number' && window.__IDLE_MS__ > 0) ? window.__IDLE_MS__ : IDLE_MS_DEFAULT);
    };
    resetRef.current = arm;
    arm();
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    return () => {
      clearTimeout(timer);
      resetRef.current = () => {};
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
  }, [enabled]);

  return useCallback(() => resetRef.current(), []);
}

function useKeyboard(handler) {
  useEffect(() => {
    const fn = (e) => handler(e);
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [handler]);
}

function useGamepad(handler) {
  // Stash handler in a ref so we can update it without restarting the rAF loop
  // (the loop must be set up exactly once per mount, otherwise it triggers
  // re-renders constantly and re-fires CSS mount animations).
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; }, [handler]);

  useEffect(() => {
    let frame;
    const prev = {};
    let active = false;
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) {
        if (!p) continue;
        active = true;
        p.buttons.forEach((b, i) => {
          if (b.pressed && !prev[i]) handlerRef.current?.({ button: i, pad: p });
          prev[i] = b.pressed;
        });
      }
      // If no gamepad is ever connected, slow the poll way down so we don't
      // burn CPU + cause infinite render thrash on every browser.
      if (active) frame = requestAnimationFrame(poll);
      else frame = setTimeout(poll, 1000);
    };
    frame = requestAnimationFrame(poll);
    return () => { cancelAnimationFrame(frame); clearTimeout(frame); };
  }, []); // <- empty deps; runs ONCE per mount
}

function cx(...parts) { return parts.filter(Boolean).join(' '); }

// Demo "snap" data — abstract scene posters (no branded content)
const DEMO_SNAPS = [
  { id: 1, label: 'SCENE 01', from: '#ffb547', to: '#ff5d6c' },
  { id: 2, label: 'SCENE 02', from: '#06d6a0', to: '#118ab2' },
  { id: 3, label: 'SCENE 03', from: '#ef476f', to: '#8338ec' },
  { id: 4, label: 'SCENE 04', from: '#ffd166', to: '#ff5d00' },
  { id: 5, label: 'SCENE 05', from: '#6ee7b7', to: '#2b2550' },
  { id: 6, label: 'SCENE 06', from: '#ff006e', to: '#3a86ff' },
  { id: 7, label: 'SCENE 07', from: '#fee440', to: '#00f5d4' },
  { id: 8, label: 'SCENE 08', from: '#f94144', to: '#f3722c' },
  { id: 9, label: 'SCENE 09', from: '#90be6d', to: '#43aa8b' },
  { id: 10, label: 'SCENE 10', from: '#277da1', to: '#4d908e' },
  { id: 11, label: 'SCENE 11', from: '#f9c74f', to: '#f8961e' },
  { id: 12, label: 'SCENE 12', from: '#9b5de5', to: '#f15bb5' },
];

window.useLocalStorage = useLocalStorage;
window.useSettings = useSettings;
window.useCredits = useCredits;
window.useIdleTimeout = useIdleTimeout;
window.useKeyboard = useKeyboard;
window.useGamepad = useGamepad;
window.cx = cx;
window.DEMO_SNAPS = DEMO_SNAPS;
