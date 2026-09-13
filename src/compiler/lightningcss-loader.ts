/* eslint-disable @typescript-eslint/no-require-imports */
import { dirname, resolve } from "node:path";

export function lightningcssLoader() {
  let lightningcssPath: string | undefined;

  // Try to resolve the path to lightningcss from the @expo/metro-config package
  // lightningcss is a direct dependency of @expo/metro-config
  try {
    lightningcssPath = require.resolve("lightningcss", {
      paths: [
        require
          .resolve("@expo/metro-config/package.json")
          .replace("/package.json", ""),
      ],
    });
  } catch {
    // Intentionally left empty
  }

  // If @expo/metro-config is not being used (non-metro bundler?), try and resolve it directly
  try {
    lightningcssPath ??= require.resolve("lightningcss");
  } catch {
    // Intentionally left empty
  }

  if (!lightningcssPath) {
    throw new Error(
      "react-native-css was unable to determine the path to lightningcss",
    );
  }

  const { transform: lightningcss, Features } = require(
    lightningcssPath,
  ) as typeof import("lightningcss");

  let version: unknown;
  try {
    // Lightning CSS keeps its entry in node/ and does not export package.json.
    // Resolve relative to the selected copy, not the consumer or this loader.
    const packageJSON = require(
      resolve(dirname(lightningcssPath), "../package.json"),
    ) as Record<string, unknown>;
    version = packageJSON.version;
  } catch {
    // Some bundlers do not retain package metadata. Loading remains supported.
  }

  if (version === "1.30.2") {
    throw new Error(
      "[react-native-css] lightningcss version 1.30.2 has a critical bug that breaks compilation. Please pin the version of lightningcss to 1.30.1; or try upgrading.",
    );
  }

  return {
    lightningcss,
    Features,
  };
}
