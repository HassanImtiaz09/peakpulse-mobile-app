# FytNova — EAS Build Guide

This guide walks through building FytNova as a native development client using **Expo Application Services (EAS)**. A development build is required to unlock native modules that are unavailable in Expo Go, including **react-native-vision-camera** (live form checking) and **react-native-track-player** (background workout audio).

---

## Prerequisites

Before starting, ensure the following accounts and tools are available:

| Requirement | Purpose | Where to Get It |
|---|---|---|
| **Expo Account** | EAS Build service | [expo.dev/signup](https://expo.dev/signup) |
| **Apple Developer Account** | iOS builds and device provisioning | [developer.apple.com](https://developer.apple.com) (US $99/year) |
| **Google Play Console** (optional) | Android production distribution | [play.google.com/console](https://play.google.com/console) |
| **Node.js 18+** | Local CLI tooling | Pre-installed in this project |
| **EAS CLI** | Build commands | Installed as a dev dependency (`eas-cli`) |

---

## Step 1: Authenticate with Expo

Log in to your Expo account from the project root:

```bash
npx eas login
```

You will be prompted for your Expo username and password. To verify the session:

```bash
npx eas whoami
```

---

## Step 2: Configure the Project

The project is already configured with the necessary files:

- **`eas.json`** — Defines four build profiles: `development`, `development-simulator`, `preview`, and `production`.
- **`app.config.ts`** — Contains the bundle identifier, native plugins (vision-camera, track-player), and platform permissions.

No manual edits are required unless you need to change the bundle identifier or Apple Team ID. If submitting to the App Store, update the `submit.production.ios` section in `eas.json` with your Apple credentials.

---

## Step 3: Build the Development Client

### iOS (Physical Device)

```bash
pnpm eas:build:dev:ios
```

This triggers a cloud build on EAS servers. The first build takes approximately 15–20 minutes. Once complete, EAS provides a download link or a QR code to install the `.ipa` on your registered device.

**Important:** iOS development builds require your device UDID to be registered in your Apple Developer provisioning profile. EAS handles this automatically during the first build — follow the interactive prompts.

### iOS (Simulator)

```bash
pnpm eas:build:dev:simulator
```

After the build completes, download the `.app` artifact and install it in the iOS Simulator:

```bash
# Download the build artifact (EAS provides the URL)
curl -o dev-build.tar.gz <BUILD_URL>
tar -xzf dev-build.tar.gz

# Install in the simulator
xcrun simctl install booted ./path-to-app.app
```

### Android (Physical Device or Emulator)

```bash
pnpm eas:build:dev:android
```

This produces a debug `.apk` file. Download and install it on your Android device or emulator:

```bash
# For a connected device/emulator via ADB
adb install ./path-to-build.apk
```

---

## Step 4: Run the Development Server

After installing the development client on your device, start the Metro bundler with the `--dev-client` flag:

```bash
npx expo start --dev-client
```

This starts Metro and displays a QR code. Open the FytNova dev client app on your device and scan the QR code (or enter the URL manually) to connect.

**Tip:** The dev client replaces Expo Go. All native modules (VisionCamera, TrackPlayer) are available in the dev client but not in Expo Go.

---

## Step 5: Preview and Production Builds

### Preview Build (Internal Testing)

Preview builds are release-mode binaries distributed internally (no app store submission required):

```bash
pnpm eas:build:preview
```

This builds both iOS and Android by default. To target a single platform:

```bash
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
```

### Production Build (App Store / Play Store)

```bash
pnpm eas:build:prod
```

Production builds use release configuration and auto-increment the version number. The Android build produces an `.aab` (App Bundle) for Play Store submission, while iOS produces an `.ipa` for App Store Connect.

---

## Build Profiles Summary

| Profile | Platform | Output | Use Case |
|---|---|---|---|
| `development` | iOS (device) | `.ipa` (debug) | Day-to-day development with native modules |
| `development` | Android | `.apk` (debug) | Day-to-day development with native modules |
| `development-simulator` | iOS (simulator) | `.app` (debug) | Simulator testing with native modules |
| `preview` | Both | `.ipa` / `.apk` (release) | Internal QA and stakeholder testing |
| `production` | Both | `.ipa` / `.aab` (release) | App Store and Play Store submission |

---

## Native Modules Unlocked by EAS Build

The following features require a development build and will not function in Expo Go:

| Module | Package | Feature |
|---|---|---|
| **VisionCamera** | `react-native-vision-camera` | Live camera feed for form checking and pose estimation |
| **Track Player** | `react-native-track-player` | Background audio playback for workout music |
| **Worklets** | `react-native-worklets-core` | JavaScript worklets for frame processing |

---

## Troubleshooting

### Build fails with "No matching provisioning profile"

Run the following to re-configure iOS credentials:

```bash
npx eas credentials
```

Select your iOS project, then choose "Set up new credentials" to generate a new provisioning profile.

### Android build fails with Gradle errors

Clear the Gradle cache and retry:

```bash
npx eas build --profile development --platform android --clear-cache
```

### Dev client cannot connect to Metro

Ensure your development machine and device are on the same Wi-Fi network. If using a tunnel:

```bash
npx expo start --dev-client --tunnel
```

### "Module not found" for native modules in Expo Go

Native modules like `react-native-vision-camera` are not available in Expo Go. You must use a development build (see Step 3).

---

## Useful Commands Reference

```bash
# Login to Expo
npx eas login

# Check login status
npx eas whoami

# Build development client (iOS device)
pnpm eas:build:dev:ios

# Build development client (iOS simulator)
pnpm eas:build:dev:simulator

# Build development client (Android)
pnpm eas:build:dev:android

# Build preview (internal distribution)
pnpm eas:build:preview

# Build production (store submission)
pnpm eas:build:prod

# Start Metro for dev client
npx expo start --dev-client

# Manage iOS/Android credentials
npx eas credentials

# Check build status
npx eas build:list
```
