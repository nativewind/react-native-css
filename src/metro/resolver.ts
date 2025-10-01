import { basename, resolve, sep } from "node:path";

import type {
  CustomResolutionContext,
  CustomResolver,
  Resolution,
} from "metro-resolver";

import { allowedModules } from "../babel/allowedModules";

const thisModuleDist = resolve(__dirname, "../../../dist");
const thisModuleSrc = resolve(__dirname, "../../../src");

function isFromThisModule(filename: string): boolean {
  return (
    filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc)
  );
}

export function nativeResolver(
  resolver: CustomResolver,
  context: CustomResolutionContext,
  moduleName: string,
  platform: string | null,
): Resolution {
  const resolution = resolver(context, moduleName, platform);
  const isInternal = isFromThisModule(context.originModulePath);
  const isReactNativeIndex = context.originModulePath.endsWith(
    `${sep}react-native${sep}index.js`,
  );

  if (isInternal || resolution.type !== "sourceFile" || isReactNativeIndex) {
    return resolution;
  }

  if (moduleName === "react-native") {
    return resolver(context, `react-native-css/components`, platform);
  } else if (moduleName === "react-native-safe-area-context") {
    return resolver(
      context,
      `react-native-css/components/react-native-safe-area-context`,
      platform,
    );
  } else if (
    resolution.filePath.includes(`${sep}react-native${sep}Libraries${sep}`)
  ) {
    const filename = basename(resolution.filePath.split(sep).at(-1) ?? "");
    const module = filename.split(".").at(0);

    if (module && allowedModules.has(module)) {
      return resolver(
        context,
        `react-native-css/components/${module}`,
        platform,
      );
    }
  }

  return resolution;
}

export function webResolver(
  resolver: CustomResolver,
  context: CustomResolutionContext,
  moduleName: string,
  platform: string | null,
): Resolution {
  const resolution = resolver(context, moduleName, platform);

  if (
    // Don't include our internal files
    isFromThisModule(context.originModulePath) ||
    // Only operate on source files
    resolution.type !== "sourceFile" ||
    // Skip anything that isn't importing from `react-native-web`
    !resolution.filePath.includes(`${sep}react-native-web${sep}`) ||
    // Skip internal react-native-web files
    resolution.filePath.includes(`${sep}react-native-web${sep}dist${sep}vendor`)
  ) {
    return resolution;
  }

  // We only care about `react-native-web/<segment>/<segment>/<module>/index.js` components
  const segments = resolution.filePath.split(sep);
  const isIndex = segments.at(-1)?.startsWith("index.");
  const module = segments.at(-2);

  if (
    !isIndex ||
    !module ||
    !allowedModules.has(module) ||
    module === "VirtualizedList"
  ) {
    return resolution;
  }

  return resolver(context, `react-native-css/components/${module}`, platform);
}
