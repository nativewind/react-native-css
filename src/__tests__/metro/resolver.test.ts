import { join } from "path";

import type {
  CustomResolutionContext,
  CustomResolver,
  Resolution,
} from "metro-resolver";

import { transformWithBabelPlugin } from "../_transform";
import { allowedModules } from "../../babel/allowedModules";
import { nativeResolver, webResolver } from "../../metro/resolver";

/**
 * A complete `CustomResolutionContext`. The resolvers read `originModulePath`
 * and forward the rest untouched, but the type is honoured in full so the
 * fixture needs no cast.
 */
function createResolutionContext(
  originModulePath: string,
  resolveRequest: CustomResolver,
): CustomResolutionContext {
  return {
    allowHaste: false,
    assetExts: [],
    customResolverOptions: {},
    disableHierarchicalLookup: false,
    doesFileExist: () => false,
    fileSystemLookup: () => ({ exists: false }),
    getPackage: () => null,
    getPackageForModule: () => null,
    mainFields: [],
    nodeModulesPaths: [],
    originModulePath,
    preferNativePlatform: false,
    redirectModulePath: (modulePath: string) => modulePath,
    resolveAsset: () => undefined,
    resolveHasteModule: () => undefined,
    resolveHastePackage: () => undefined,
    resolveRequest,
    sourceExts: [],
    unstable_conditionNames: [],
    unstable_conditionsByPlatform: {},
    unstable_enablePackageExports: false,
    unstable_logWarning: () => undefined,
  };
}

interface ResolverRun {
  /** Every module name the parent resolver was asked for, in order. */
  readonly requests: string[];
  readonly resolution: Resolution;
}

/**
 * Runs one of the two resolvers against a parent that reports `filePath` for the
 * first request and echoes the module name for any re-resolution. The module
 * name of the LAST request is the plane's answer — the metro-side equivalent of
 * the specifier the babel plane emits.
 */
function runResolver(
  resolver: typeof nativeResolver,
  options: {
    readonly originModulePath: string;
    readonly moduleName: string;
    readonly filePath: string;
    readonly platform: string | null;
  },
): ResolverRun {
  const requests: string[] = [];
  let isFirst = true;

  const parent: CustomResolver = (_context, moduleName) => {
    requests.push(moduleName);
    const resolved = isFirst ? options.filePath : moduleName;
    isFirst = false;
    return { type: "sourceFile", filePath: resolved };
  };

  const context = createResolutionContext(options.originModulePath, parent);
  const resolution = resolver(
    parent,
    context,
    options.moduleName,
    options.platform,
  );

  return { requests, resolution };
}

const APP_FILE = join("/project", "src", "screens", "Home.js");

function reactNativeLibrariesPath(component: string): string {
  return join(
    "/project",
    "node_modules",
    "react-native",
    "Libraries",
    "Components",
    component,
    `${component}.js`,
  );
}

function reactNativeWebExportPath(component: string): string {
  return join(
    "/project",
    "node_modules",
    "react-native-web",
    "dist",
    "exports",
    component,
    "index.js",
  );
}

/**
 * The component census both planes read. Filtered to the members that are also
 * JavaScript identifiers, because the babel plane can only be reached through an
 * import specifier — `src/components/react-native-safe-area-context.native.tsx`
 * contributes a census entry that no `import { … }` can name.
 */
const componentNames = [...allowedModules]
  .filter((name) => /^[A-Z][A-Za-z0-9]*$/.test(name))
  .sort();

describe("the component census", () => {
  test("is not empty", () => {
    // Every table below is generated from this census, so an empty one would
    // turn each of them into a silent no-op rather than a failure.
    expect(componentNames.length).toBeGreaterThan(0);
  });
});

describe("nativeResolver", () => {
  test("routes the react-native barrel to the components barrel", () => {
    const { requests } = runResolver(nativeResolver, {
      originModulePath: APP_FILE,
      moduleName: "react-native",
      filePath: join("/project", "node_modules", "react-native", "index.js"),
      platform: "ios",
    });

    expect(requests.at(-1)).toBe("react-native-css/components");
  });

  test.each(componentNames)(
    "routes a resolved Libraries/Components file for %s",
    (component) => {
      const { requests } = runResolver(nativeResolver, {
        originModulePath: APP_FILE,
        moduleName: `./${component}`,
        filePath: reactNativeLibrariesPath(component),
        platform: "ios",
      });

      expect(requests.at(-1)).toBe(`react-native-css/components/${component}`);
    },
  );

  test("leaves react-native's own index alone", () => {
    const { requests } = runResolver(nativeResolver, {
      originModulePath: join(
        "/project",
        "node_modules",
        "react-native",
        "index.js",
      ),
      moduleName: "react-native",
      filePath: join("/project", "node_modules", "react-native", "index.js"),
      platform: "ios",
    });

    expect(requests).toEqual(["react-native"]);
  });

  test("leaves a file outside react-native alone", () => {
    const { requests } = runResolver(nativeResolver, {
      originModulePath: APP_FILE,
      moduleName: "./Button",
      filePath: join("/project", "src", "components", "Button.js"),
      platform: "ios",
    });

    expect(requests).toEqual(["./Button"]);
  });
});

describe("webResolver", () => {
  test.each(componentNames.filter((name) => name !== "VirtualizedList"))(
    "routes a resolved react-native-web export for %s",
    (component) => {
      const { requests } = runResolver(webResolver, {
        originModulePath: APP_FILE,
        moduleName: `./${component}`,
        filePath: reactNativeWebExportPath(component),
        platform: "web",
      });

      expect(requests.at(-1)).toBe(`react-native-css/components/${component}`);
    },
  );

  test("leaves react-native-web's vendored copies alone", () => {
    const { requests } = runResolver(webResolver, {
      originModulePath: APP_FILE,
      moduleName: "./View",
      filePath: join(
        "/project",
        "node_modules",
        "react-native-web",
        "dist",
        "vendor",
        "react-native",
        "View",
        "index.js",
      ),
      platform: "web",
    });

    expect(requests).toEqual(["./View"]);
  });

  test("leaves a non-index file inside an export directory alone", () => {
    const { requests } = runResolver(webResolver, {
      originModulePath: APP_FILE,
      moduleName: "./View/types",
      filePath: join(
        "/project",
        "node_modules",
        "react-native-web",
        "dist",
        "exports",
        "View",
        "types.js",
      ),
      platform: "web",
    });

    expect(requests).toEqual(["./View/types"]);
  });
});

describe("the metro and babel planes agree", () => {
  // They are alternatives, not layers: metro's `resolveRequest` rewrites when
  // `globalClassNamePolyfill` is false, and the babel plugin rewrites when it is
  // true (`src/metro/index.ts`). A user flipping that flag must land on the same
  // component either way, so the two implementations are pinned against each
  // other over the one census they both read.

  test.each(componentNames)("react-native's %s", (component) => {
    const { requests } = runResolver(nativeResolver, {
      originModulePath: APP_FILE,
      moduleName: `./${component}`,
      filePath: reactNativeLibrariesPath(component),
      platform: "ios",
    });

    const babel = transformWithBabelPlugin(
      `import { ${component} } from "react-native";`,
      APP_FILE,
    );

    expect(requests.at(-1)).toBe(`react-native-css/components/${component}`);
    expect(babel).toBe(
      `import { ${component} } from "react-native-css/components/${component}";`,
    );
  });

  test.each(componentNames.filter((name) => name !== "VirtualizedList"))(
    "react-native-web's %s",
    (component) => {
      const { requests } = runResolver(webResolver, {
        originModulePath: APP_FILE,
        moduleName: `./${component}`,
        filePath: reactNativeWebExportPath(component),
        platform: "web",
      });

      const babel = transformWithBabelPlugin(
        `import { ${component} } from "react-native-web";`,
        APP_FILE,
      );

      expect(requests.at(-1)).toBe(`react-native-css/components/${component}`);
      expect(babel).toBe(
        `import { ${component} } from "react-native-css/components/${component}";`,
      );
    },
  );

  test("except for VirtualizedList on web, which only the babel plane rewrites", () => {
    // `webResolver` excludes it by name; the babel plane has no such exclusion.
    // Pinned so the asymmetry is a decision on record rather than a surprise.
    const { requests } = runResolver(webResolver, {
      originModulePath: APP_FILE,
      moduleName: "./VirtualizedList",
      filePath: reactNativeWebExportPath("VirtualizedList"),
      platform: "web",
    });

    expect(requests).toEqual(["./VirtualizedList"]);
    expect(
      transformWithBabelPlugin(
        `import { VirtualizedList } from "react-native-web";`,
        APP_FILE,
      ),
    ).toBe(
      `import { VirtualizedList } from "react-native-css/components/VirtualizedList";`,
    );
  });

  test("except for react-native-safe-area-context, which only the metro plane rewrites", () => {
    const { requests } = runResolver(nativeResolver, {
      originModulePath: APP_FILE,
      moduleName: "react-native-safe-area-context",
      filePath: join(
        "/project",
        "node_modules",
        "react-native-safe-area-context",
        "src",
        "index.tsx",
      ),
      platform: "ios",
    });

    expect(requests.at(-1)).toBe(
      "react-native-css/components/react-native-safe-area-context",
    );
    expect(
      transformWithBabelPlugin(
        `import { SafeAreaView } from "react-native-safe-area-context";`,
        APP_FILE,
      ),
    ).toBe(`import { SafeAreaView } from "react-native-safe-area-context";`);
  });
});
