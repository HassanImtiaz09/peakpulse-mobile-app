const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ── Memory optimization ─────────────────────────────────────────────────────
// Limit Metro transformer workers to 2 (default is CPU count, typically 4).
// Each jest-worker child process consumes ~40-50 MB RSS. Reducing from 4 to 2
// saves ~100 MB and prevents OOM kills in memory-constrained environments.
config.maxWorkers = 2;

// Exclude react-native-maps on web to avoid native-only module errors
config.resolver = config.resolver || {};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      filePath: require.resolve("./components/map-view-web.tsx"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
