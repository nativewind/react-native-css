/* eslint-disable @typescript-eslint/no-require-imports */
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

  try {
    const lightningcssPackageJSONPath = require.resolve("../../package.json", {
      paths: [lightningcssPath],
    });

    const packageJSON = require(lightningcssPackageJSONPath) as Record<
      string,
      unknown
    >;

    if (packageJSON.version === "1.30.2") {
      throw new Error(
        "[react-native-css] lightningcss version 1.30.2 has a critical bug that breaks compilation. Please pin the version of lightningcss to 1.30.1; or try upgrading.",
      );
    }
  } catch {
    // Intentionally left empty
  }

  return {
    lightningcss,
    Features,
  };
}
