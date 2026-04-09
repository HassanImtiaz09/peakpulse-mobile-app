# Alternative Bundling Solutions for PeakPulse: A Memory-Efficiency Analysis

**Author:** Manus AI
**Date:** April 9, 2026
**Project:** PeakPulse Mobile (Expo SDK 54, React Native 0.81)

---

## Executive Summary

The PeakPulse mobile application has grown to **241 source files** containing approximately **97,000 lines of TypeScript** across 74 screens, plus 92 test files with an additional 22,000 lines. This scale, combined with a sandbox environment limited to **3.8 GB RAM and 2 GB swap**, causes the Metro bundler's Node.js process to consume 1.3--2.1 GB of resident memory during development, triggering repeated **OOM (Out-of-Memory) kills** by the Linux kernel.

This report evaluates four alternative bundling approaches to determine whether any can meaningfully reduce dev-server memory consumption for a project of this size and dependency profile. The conclusion is nuanced: while alternatives exist, **none offer a drop-in, low-risk solution** for PeakPulse's specific combination of Expo Router, NativeWind, and constrained RAM. The most practical path forward involves Metro-level optimizations rather than a bundler replacement.

---

## The Problem: Dev Server Memory, Not Production Bundle Size

A critical distinction must be drawn between two separate concerns that are often conflated in discussions about bundler performance:

| Concern | Description | Affected Phase |
|---------|-------------|----------------|
| **Production bundle size** | The size of the final JS bundle shipped to users | `expo export` / `react-native bundle` |
| **Dev server memory** | RAM consumed by the bundler process during development | `expo start` / `npx expo start` |

PeakPulse's problem is exclusively the latter. The Metro dev server must parse, transform, and hold in memory the entire module graph (source files + `node_modules`) while watching for changes. With 74 dependencies and 97K lines of source code, this graph is substantial. Most "alternative bundler" discussions focus on production bundle size improvements (tree shaking, code splitting), which **do not address dev-time memory pressure** [1].

---

## Alternatives Evaluated

### 1. Re.Pack 5 (Rspack/webpack backend)

Re.Pack is the most mature Metro alternative for React Native, developed by Callstack. Version 5 introduced first-class support for **Rspack**, a Rust-based bundler that is API-compatible with webpack but significantly faster [2].

| Attribute | Details |
|-----------|---------|
| **Build speed** | Rspack: dev 410ms, build 280ms, HMR 80ms (vs. webpack+Babel: 5.02s, 6.52s, 200ms) [2] |
| **RN 0.81 support** | Officially supported since Re.Pack 5.2 (August 2025) [3] |
| **Tree shaking** | Full webpack/Rspack tree shaking out of the box |
| **Code splitting** | Native support for dynamic imports and Module Federation 2 |
| **NativeWind 4** | Supported via `@callstack/repack-plugin-nativewind` [4] |
| **Reanimated 4** | Supported (SWC plugin available) [3] |

**Expo Router compatibility** is the critical blocker. Expo Router deeply integrates with Metro's module resolution system for file-based routing. Re.Pack does **not** officially support Expo Router. A community template exists (`ceopaludetto/expo-router-repack-template`) that demonstrates a workaround involving replacing Expo CLI with React Native CLI via a config plugin, proxying Metro's virtual module entry point, and setting custom environment variables (`EXPO_PROJECT_ROOT`, `EXPO_ROUTER_APP_ROOT`) [5]. However, this approach has significant limitations:

- **Expo Go does not work** with Re.Pack -- native development builds are required [5]
- **EAS Build** integration is unverified and likely requires custom build scripts
- A draft `@callstack/repack-plugin-expo` was mentioned in the Re.Pack 5.2 release notes but has not been officially released [3]
- The community template targets a simpler project structure than PeakPulse's 74-screen app

**Memory implications:** Rspack is written in Rust and performs bundling in native code, which should theoretically use less memory than Metro's JavaScript-based bundling. However, Rspack has its own **documented memory leak issues** in dev server mode. GitHub issue #8976 reports dev server processes growing to 20--50 GB of RAM on large projects, traced partly to the `parallelCodeSplitting` feature enabled by default since Rspack 1.3.0 [6]. While a workaround exists (disabling `parallelCodeSplitting`), the issue remains open as of April 2026. This means **Rspack is not a guaranteed improvement** for dev-time memory consumption.

**Migration effort for PeakPulse:** Very high. Would require ejecting from Expo's managed workflow, replacing Expo CLI, rewriting Metro configuration, verifying all 74 Expo SDK module integrations, and accepting the loss of Expo Go for development testing.

---

### 2. rnx-kit metro-serializer-esbuild (Microsoft)

Microsoft's `@rnx-kit/metro-serializer-esbuild` takes a different approach: it keeps Metro as the bundler but replaces the **serialization step** with esbuild, adding tree shaking to Metro's output [7].

| Attribute | Details |
|-----------|---------|
| **Approach** | Metro plugin (replaces serializer only) |
| **Tree shaking** | Yes, via esbuild |
| **Bundle size reduction** | 0--20% typically, sometimes more [1] |
| **Status** | Beta |
| **Metro version** | Requires Metro 0.66.1+ (PeakPulse uses a compatible version) |

The fundamental limitation is stated clearly in the documentation:

> `esbuildTransformerConfig` is incompatible with dev server and debug builds. It should only be set when bundling for production. [7]

This means `metro-serializer-esbuild` **cannot help with dev server memory** at all. It only affects production bundle generation. For PeakPulse's OOM problem during `expo start`, this tool provides zero benefit.

**Migration effort:** Low for production builds (add a Metro config plugin), but irrelevant to the problem at hand.

---

### 3. react-native-esbuild

The `react-native-esbuild` project by leegeunhyeok replaces Metro entirely with esbuild, a Go-based bundler known for extreme speed and low memory usage [8].

| Attribute | Details |
|-----------|---------|
| **Build speed** | Extremely fast (esbuild is 10--100x faster than webpack) |
| **Memory usage** | Significantly lower than Metro (Go's memory model) |
| **Hermes support** | Not supported [1] |
| **Expo Router** | Not supported |
| **NativeWind** | Not supported |
| **Status** | Under development, not production-ready [8] |

This project is the most promising in terms of raw memory efficiency, since esbuild's Go runtime has fundamentally different memory characteristics than Node.js. However, it lacks support for Hermes (React Native's default JS engine since RN 0.70), Expo Router, and NativeWind -- three technologies that PeakPulse depends on critically.

**Migration effort:** Not feasible. Would require rewriting the entire build pipeline and losing core dependencies.

---

### 4. Expo's Built-in Tree Shaking (Metro, SDK 52+)

Expo SDK 52 introduced experimental module-level tree shaking, which became **enabled by default in SDK 54** via `experimentalImportSupport` [9]. This includes:

- **Platform shaking:** Separate bundles per platform with `Platform.OS` conditional removal
- **Development-only code removal:** `process.env.NODE_ENV` and `__DEV__` conditionals stripped in production
- **Module-level tree shaking:** Unused imports/exports removed across the module graph (ESM only)

However, all of these optimizations **only apply to production bundles**. The tree shaking pass runs during `expo export`, not during `expo start`. The dev server still loads the full module graph into memory.

---

## Comparative Summary

| Alternative | Dev Memory Improvement | Expo Router | NativeWind 4 | Reanimated 4 | Migration Risk | Production Bundle |
|-------------|----------------------|-------------|--------------|--------------|----------------|-------------------|
| **Re.Pack 5 (Rspack)** | Uncertain (Rspack has own memory leaks) | Community workaround only | Plugin available | Supported | Very High | Smaller (tree shaking) |
| **rnx-kit esbuild serializer** | None (production only) | N/A (keeps Metro) | N/A | N/A | Low | Smaller (tree shaking) |
| **react-native-esbuild** | Likely significant | Not supported | Not supported | Unknown | Not feasible | Smaller |
| **Expo tree shaking (SDK 54)** | None (production only) | Native | Native | Native | None | Smaller |

---

## Practical Recommendations for PeakPulse

Given that no alternative bundler offers a safe, compatible path to reducing dev-server memory for PeakPulse, the recommended approach is to **optimize within Metro and the existing environment**:

### Immediate Actions (Low Risk)

**1. Reduce `NODE_OPTIONS --max-old-space-size`** from 5120 MB to 2048 MB. This forces Node.js to garbage-collect more aggressively, trading occasional GC pauses for lower peak memory. The current 5 GB limit is far above the sandbox's 3.8 GB physical RAM, guaranteeing OOM kills before Node's GC can intervene.

**2. Disable the TypeScript watcher** (`tsc --watch`) during development. The watcher alone consumes ~313 MB RSS. Run type checks on-demand (`npx tsc --noEmit`) instead of continuously.

**3. Close unnecessary browser tabs** in the sandbox. Each Chromium renderer process consumes 50--150 MB. The development preview can be accessed via QR code on a physical device instead.

### Medium-Term Actions (Moderate Effort)

**4. Enable Metro's lazy bundling.** By default, Metro eagerly bundles the entire app. Configuring Metro to only bundle modules as they are requested can significantly reduce initial memory pressure. This is configured via `metro.config.js`:

```js
// metro.config.js
const config = getDefaultConfig(__dirname);
config.server = {
  ...config.server,
  experimentalImportBundleSupport: true,
};
```

**5. Split test files from the Metro watcher.** Ensure `metro.config.js` excludes `__tests__/` from the watch list. Metro watches all files in the project root by default, and 92 test files (22K lines) add unnecessary overhead to the module graph.

**6. Audit and reduce dependencies.** With 74 production dependencies, each adds to Metro's module graph. Identify unused or duplicated packages with `npx depcheck` and remove them.

### Long-Term Considerations

**7. Monitor Re.Pack's Expo Router plugin.** The draft `@callstack/repack-plugin-expo` could eventually provide official Expo Router support. If released and stabilized, Re.Pack with Rspack would become a viable migration target, especially if Rspack's memory leak issues are resolved.

**8. Watch for Metro improvements.** The Metro team has been working on tree shaking (experimental in SDK 54) and performance improvements. React Native 0.83 and Expo SDK 55 may bring further optimizations to Metro's memory footprint.

**9. Consider project modularization.** If PeakPulse continues to grow beyond 100K lines, consider splitting it into a monorepo with separate packages. This allows Metro to resolve only the packages needed for the current development context.

---

## Conclusion

The investigation reveals that **Metro remains the only fully compatible bundler** for PeakPulse's technology stack (Expo SDK 54, Expo Router 6, NativeWind 4, Reanimated 4, tRPC). The alternatives either lack critical compatibility (Re.Pack with Expo Router, react-native-esbuild with Hermes/NativeWind) or only optimize production bundles without addressing dev-server memory (rnx-kit, Expo tree shaking).

The most impactful immediate action is reducing `NODE_OPTIONS --max-old-space-size` from 5120 to 2048 and disabling the continuous TypeScript watcher. These changes alone should reduce peak memory by 500 MB--1 GB, potentially eliminating or significantly reducing OOM kill frequency within the current sandbox constraints.

The React Native ecosystem is actively evolving toward more memory-efficient tooling. Re.Pack's Expo Router plugin and Metro's ongoing improvements are the most promising developments to watch. For now, the pragmatic path is to optimize within Metro rather than undertake a high-risk bundler migration.

---

## References

[1]: https://www.callstack.com/blog/optimize-react-native-apps-javascript-bundle "Optimize Your React Native App's JavaScript Bundle - Callstack (Feb 2023)"

[2]: https://www.callstack.com/blog/announcing-re-pack-5-with-rspack-module-federation "Re.Pack 5: Mobile Microfrontends, 5x Faster, Less Configuration - Callstack (Feb 2025)"

[3]: https://www.callstack.com/blog/re-pack-5-2-faster-babel-transforms-support-for-rn-0-80-0-81-rozenite "Re.Pack 5.2: Faster Babel Transforms, RN 0.80 & 0.81 - Callstack (Aug 2025)"

[4]: https://re-pack.dev/docs/features/nativewind "Re.Pack NativeWind Integration Guide"

[5]: https://github.com/callstack/repack/discussions/1264 "Re.Pack with Expo CNG + Router - GitHub Discussion"

[6]: https://github.com/web-infra-dev/rspack/issues/8976 "Memory Leak in Dev Server Causing System to Run Out of Application Memory - Rspack GitHub Issue #8976"

[7]: https://microsoft.github.io/rnx-kit/docs/tools/metro-serializer-esbuild "metro-serializer-esbuild - Microsoft rnx-kit Documentation"

[8]: https://github.com/leegeunhyeok/react-native-esbuild "react-native-esbuild - GitHub"

[9]: https://docs.expo.dev/guides/tree-shaking/ "Tree shaking and code removal - Expo Documentation"
