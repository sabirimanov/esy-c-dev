# SmartAzerigas CCC (Android tablet remote)

Landscape WebView shell for the CCC video wall at `https://cccdev.esyasoft.app`.

## Features

- Full-screen 16:9 letterboxed pages (black bars, no stretch)
- Horizontal swipe between screens (stops at edges)
- Side FAB → Controls: Operations / SOC·NOC, Select filters, View all
- `?tablet=1&noborder=1` so cyan frames are hidden
- View all loads `/overview` or `/socnoc/overview` with pinch-zoom

## Build

```bash
cd android
./gradlew :app:assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

Install on a connected tablet:

```bash
./gradlew :app:installDebug
```

Requires Android SDK (API 35) and JDK 17+.
