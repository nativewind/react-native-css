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

  if (
    // Don't include our internal files
    isFromThisModule(context.originModulePath) ||
    // Only operate on source files
    resolution.type !== "sourceFile" ||
    // Skip the React Native barrel file to prevent infinite recursion
    context.originModulePath.endsWith("react-native/index.js") ||
    // Skip anything that isn't importing a React Native component
    !(
      moduleName.startsWith("react-native") ||
      moduleName.startsWith("react-native/")
    )
  ) {
    return resolution;
  }

  if (moduleName === "react-native") {
    return resolver(context, `react-native-css/components`, platform);
  }

  // We only care about `react-native/Library/Components/<module>.js` components
  const segments = resolution.filePath.split(sep);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const module = basename(segments.at(-1)!).split(".")[0];

  if (!module || !allowedModules.has(module)) {
    return resolution;
  }

  return resolver(context, `react-native-css/components/${module}`, platform);
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
    !resolution.filePath.includes(`${sep}react-native-web${sep}`)
  ) {
    return resolution;
  }

  // We only care about `react-native-web/<segment>/<segment>/<module>/index.js` components
  const segments = resolution.filePath.split(sep);
  const isIndex = segments.at(-1)?.startsWith("index.");
  const module = segments.at(-2);

  if (!isIndex || !module || !allowedModules.has(module)) {
    return resolution;
  }

  return resolver(context, `react-native-css/components/${module}`, platform);
}
