# Native Builds (deferred)

Native Android/iOS wrappers are a v2 deliverable. They are deferred — not dropped — because
they cannot be validated without toolchains this project's environments lack.

## Why deferred

| Platform | Prerequisite | Status |
| --- | --- | --- |
| Android | JDK 17 + Android SDK (Gradle `assembleDebug`) | not installed in dev environments to date |
| iOS | macOS + Xcode | requires a Mac or CI runner |

## The path when ready

The app is a static web bundle, so [Capacitor](https://capacitorjs.com) wraps it directly
(an earlier Capacitor scaffold existed in a local-only branch and was never pushed; recreate
rather than archaeology):

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Pokemon Snap Station" com.snapstation.app --web-dir .
npx cap add android && npx cap add ios
npx cap sync
npx cap open android   # Android Studio → run on device
npx cap open ios       # Xcode → run on device
```

Notes for the wrapper:
- The kiosk needs an HTTP origin: Capacitor serves the web dir over its own scheme, which
  satisfies babel-standalone's XHR (file:// does not).
- Camera: swap `getUserMedia` constraints if targeting native camera APIs, or keep the web
  camera path (works in modern WebViews with the right Android permissions:
  `android.permission.CAMERA`, plus `webkit-playsinline` behaviors on iOS).
- Printing: native print dialogs replace `window.print()`; the print-server path
  (`deploy/print-server`) also works over LAN from a tablet.
- Icons/splash: generate from `assets/icons/icon.svg`.

## CI option

GitHub Actions: `ubuntu-latest` + `actions/setup-java@v4` (JDK 17) + Android SDK action
covers Android APK builds; `macos-latest` covers the iOS archive (unsigned) for validation.
