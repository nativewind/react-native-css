import { resolve, sep } from "node:path";

import type { MetroConfig } from "metro-config";
import type {
  CustomResolutionContext,
  CustomResolver,
  Resolution,
} from "metro-resolver";

import { withReactNativeCSS } from "../../metro";

// `globalClassNamePolyfill` is the gate that decides whether the resolvers run
// at all (`src/metro/index.ts`). The resolvers themselves are covered
// separately; this covers the dispatch into them.

// The resolver reads exactly two fields off the context. Building the rest of
// `ResolutionContext` would be forty fields of metro internals that no code
// path under test touches, so the fixture is bridged once, here.
function makeContext(
  originModulePath: string,
  resolveRequest: CustomResolver,
): CustomResolutionContext {
  return {
    originModulePath,
    resolveRequest,
  } as unknown as CustomResolutionContext;
}

function makeRecorder(): { calls: string[]; resolver: CustomResolver } {
  const calls: string[] = [];

  const resolver: CustomResolver = (_context, moduleName): Resolution => {
    calls.push(moduleName);
    return {
      type: "sourceFile",
      filePath: resolve("/app/node_modules", moduleName, "index.js"),
    };
  };

  return { calls, resolver };
}

function makeConfig(
  options?: Parameters<typeof withReactNativeCSS>[1],
): MetroConfig {
  return withReactNativeCSS<MetroConfig>(
    {},
    { disableTypeScriptGeneration: true, ...options },
  );
}

function resolveThrough(
  config: MetroConfig,
  moduleName: string,
  platform: string | null,
  resolver: CustomResolver,
): Resolution {
  const resolveRequest = config.resolver?.resolveRequest;

  if (!resolveRequest) {
    throw new Error("withReactNativeCSS did not install a resolveRequest");
  }

  return resolveRequest(
    makeContext(resolve("/app/index.js"), resolver),
    moduleName,
    platform,
  );
}

describe("globalClassNamePolyfill", () => {
  test("is off by default, so react-native resolves untouched", () => {
    const { calls, resolver } = makeRecorder();

    const resolution = resolveThrough(
      makeConfig(),
      "react-native",
      "ios",
      resolver,
    );

    // The parent resolver is asked once, for the module that was requested.
    expect(calls).toStrictEqual(["react-native"]);
    expect(resolution).toStrictEqual({
      type: "sourceFile",
      filePath: resolve("/app/node_modules/react-native/index.js"),
    });
  });

  test("routes react-native to the components barrel when on", () => {
    const { calls, resolver } = makeRecorder();

    const resolution = resolveThrough(
      makeConfig({ globalClassNamePolyfill: true }),
      "react-native",
      "ios",
      resolver,
    );

    expect(calls).toStrictEqual([
      "react-native",
      "react-native-css/components",
    ]);
    expect(resolution).toStrictEqual({
      type: "sourceFile",
      filePath: resolve(
        "/app/node_modules/react-native-css/components/index.js",
      ),
    });
  });

  test("dispatches to the web resolver on the web platform when on", () => {
    const { calls, resolver } = makeRecorder();

    const resolution = resolveThrough(
      makeConfig({ globalClassNamePolyfill: true }),
      "react-native-web/dist/exports/View",
      "web",
      resolver,
    );

    // The native resolver keys on the module name and would not have rewritten
    // this one; the web resolver keys on the resolved react-native-web path.
    expect(calls).toStrictEqual([
      "react-native-web/dist/exports/View",
      "react-native-css/components/View",
    ]);
    expect(resolution).toStrictEqual({
      type: "sourceFile",
      filePath: resolve(
        "/app/node_modules/react-native-css/components/View/index.js",
      ),
    });
  });

  test("leaves the same web module alone when off", () => {
    const { calls, resolver } = makeRecorder();

    const resolution = resolveThrough(
      makeConfig(),
      "react-native-web/dist/exports/View",
      "web",
      resolver,
    );

    expect(calls).toStrictEqual(["react-native-web/dist/exports/View"]);
    expect(resolution).toStrictEqual({
      type: "sourceFile",
      filePath: resolve(
        "/app/node_modules/react-native-web/dist/exports/View/index.js",
      ),
    });
  });

  test.each([true, false])(
    "short-circuits the metro override without consulting the parent (polyfill: %s)",
    (globalClassNamePolyfill) => {
      const { calls, resolver } = makeRecorder();

      const resolution = resolveThrough(
        makeConfig({ globalClassNamePolyfill }),
        "react-native-css-metro-override",
        "ios",
        resolver,
      );

      expect(calls).toStrictEqual([]);
      expect(resolution).toStrictEqual({
        type: "sourceFile",
        filePath: expect.stringContaining(`${sep}override.`),
      });
    },
  );

  test("prefers an existing resolveRequest over the one on the context", () => {
    const existing = makeRecorder();
    const fromContext = makeRecorder();

    const config = withReactNativeCSS<MetroConfig>(
      { resolver: { resolveRequest: existing.resolver } },
      { disableTypeScriptGeneration: true, globalClassNamePolyfill: true },
    );

    resolveThrough(config, "react-native", "ios", fromContext.resolver);

    expect(existing.calls).toStrictEqual([
      "react-native",
      "react-native-css/components",
    ]);
    expect(fromContext.calls).toStrictEqual([]);
  });

  test("appends the css source extension regardless of the gate", () => {
    expect(makeConfig().resolver?.sourceExts).toStrictEqual(["css"]);
  });
});
