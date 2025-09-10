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

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transform: lightningcss, Features } = require(
    lightningcssPath,
  ) as typeof import("lightningcss");

  return {
    lightningcss,
    Features,
  };
}
