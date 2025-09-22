import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "example",
    slug: "example",
    userInterfaceStyle: "automatic",
    android: {
      package: "dev.reactnativecss",
    },
    ios: {
      bundleIdentifier: "dev.reactnativecss",
    },
    experiments: {
      reactCompiler: false,
      buildCacheProvider:
        process.env.CI || process.env.EAS_BUILD_CACHE_PROVIDER
          ? "eas"
          : undefined,
    },
  };
};
