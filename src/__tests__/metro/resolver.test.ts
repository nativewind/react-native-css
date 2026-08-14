import { join, resolve, sep } from "node:path";

import type {
  CustomResolutionContext,
  CustomResolver,
  Resolution,
} from "metro-resolver";

import { nativeResolver, webResolver } from "../../metro/resolver";

const packageRoot = resolve(__dirname, "../../..");
const packageSource = join(packageRoot, "src");
const nodeModules = join(packageRoot, "node_modules");

/**
 * `nativeResolver` only ever reads `originModulePath` off the context and hands
 * the whole thing back to the resolver it was given, so the rest of Metro's
 * `ResolutionContext` never has to exist for these.
 */
function contextFor(originModulePath: string): CustomResolutionContext {
  return { originModulePath } as unknown as CustomResolutionContext;
}

interface Recorder {
  readonly resolver: CustomResolver;
  readonly calls: [moduleName: string, platform: string | null][];
}

/**
 * Resolves every request to a plausible source file so the resolver under test
 * takes its `resolution.type === "sourceFile"` path, and records what it was
 * asked for. `filePath` is derived from the request, which is what lets the
 * `react-native/Libraries/*` branch be driven without a node_modules tree.
 */
function recordingResolver(
  filePathFor?: (moduleName: string) => string,
): Recorder {
  const calls: [string, string | null][] = [];

  const resolver: CustomResolver = (_context, moduleName, platform) => {
    calls.push([moduleName, platform]);

    return {
      type: "sourceFile",
      filePath:
        filePathFor?.(moduleName) ?? join(nodeModules, moduleName, "index.js"),
    } satisfies Resolution;
  };

  return { resolver, calls };
}

describe("nativeResolver", () => {
  const thirdParty = join(nodeModules, "some-library", "index.js");

  test.each([
    ["react-native", "react-native-css/components"],
    [
      "react-native-safe-area-context",
      "react-native-css/components/react-native-safe-area-context",
    ],
    [
      "react-native-gesture-handler",
      "react-native-css/components/react-native-gesture-handler",
    ],
  ])("rewrites %s to %s", (moduleName, rewritten) => {
    const { resolver, calls } = recordingResolver();

    const resolution = nativeResolver(
      resolver,
      contextFor(thirdParty),
      moduleName,
      "ios",
    );

    expect(calls).toEqual([
      [moduleName, "ios"],
      [rewritten, "ios"],
    ]);
    expect(resolution).toEqual({
      type: "sourceFile",
      filePath: join(nodeModules, rewritten, "index.js"),
    });
  });

  test("rewrites a react-native Libraries module to its styled twin", () => {
    const { resolver, calls } = recordingResolver((moduleName) =>
      moduleName === "react-native/Libraries/Components/View/View"
        ? join(
            nodeModules,
            "react-native",
            "Libraries",
            "Components",
            "View",
            "View.js",
          )
        : join(nodeModules, moduleName, "index.js"),
    );

    nativeResolver(
      resolver,
      contextFor(thirdParty),
      "react-native/Libraries/Components/View/View",
      "android",
    );

    expect(calls.at(-1)).toEqual([
      "react-native-css/components/View",
      "android",
    ]);
  });

  test("leaves a Libraries module with no styled twin alone", () => {
    const { resolver, calls } = recordingResolver(() =>
      join(
        nodeModules,
        "react-native",
        "Libraries",
        "Utilities",
        "Platform.js",
      ),
    );

    nativeResolver(
      resolver,
      contextFor(thirdParty),
      "react-native/Libraries/Utilities/Platform",
      "ios",
    );

    expect(calls).toHaveLength(1);
  });

  test.each([
    ["this package's source", join(packageSource, "components", "View.tsx")],
    [
      "this package's build output",
      join(packageRoot, "dist", "module", "index.js"),
    ],
    ["react-native's own index", join(nodeModules, "react-native", "index.js")],
  ])("leaves an import from %s alone", (_label, originModulePath) => {
    const { resolver, calls } = recordingResolver();

    const resolution = nativeResolver(
      resolver,
      contextFor(originModulePath),
      "react-native-gesture-handler",
      "ios",
    );

    // Rewriting here would send this package's own modules — or react-native's
    // index — back through the wrapper that imports them, a resolution cycle.
    expect(calls).toEqual([["react-native-gesture-handler", "ios"]]);
    expect(resolution).toEqual({
      type: "sourceFile",
      filePath: join(nodeModules, "react-native-gesture-handler", "index.js"),
    });
  });

  test("leaves a resolution that is not a source file alone", () => {
    const calls: [string, string | null][] = [];
    const resolver: CustomResolver = (_context, moduleName, platform) => {
      calls.push([moduleName, platform]);
      return { type: "empty" } satisfies Resolution;
    };

    expect(
      nativeResolver(
        resolver,
        contextFor(thirdParty),
        "react-native-gesture-handler",
        "ios",
      ),
    ).toEqual({ type: "empty" });
    expect(calls).toEqual([["react-native-gesture-handler", "ios"]]);
  });

  test("leaves an unrelated module alone", () => {
    const { resolver, calls } = recordingResolver();

    nativeResolver(resolver, contextFor(thirdParty), "lodash", null);

    expect(calls).toEqual([["lodash", null]]);
  });
});

describe("webResolver", () => {
  const thirdParty = join(nodeModules, "some-library", "index.js");

  test("rewrites a react-native-web component to its styled twin", () => {
    const { resolver, calls } = recordingResolver(() =>
      join(
        nodeModules,
        "react-native-web",
        "dist",
        "exports",
        "View",
        "index.js",
      ),
    );

    webResolver(resolver, contextFor(thirdParty), "react-native", "web");

    expect(calls.at(-1)).toEqual(["react-native-css/components/View", "web"]);
  });

  test("leaves react-native-web's own vendor files alone", () => {
    const { resolver, calls } = recordingResolver(() =>
      [
        nodeModules,
        "react-native-web",
        "dist",
        "vendor",
        "View",
        "index.js",
      ].join(sep),
    );

    webResolver(resolver, contextFor(thirdParty), "react-native", "web");

    expect(calls).toHaveLength(1);
  });

  test("leaves VirtualizedList alone", () => {
    const { resolver, calls } = recordingResolver(() =>
      join(
        nodeModules,
        "react-native-web",
        "dist",
        "exports",
        "VirtualizedList",
        "index.js",
      ),
    );

    webResolver(resolver, contextFor(thirdParty), "react-native", "web");

    expect(calls).toHaveLength(1);
  });
});
