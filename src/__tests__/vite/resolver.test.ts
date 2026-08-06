import { sep } from "node:path";

import { reactNativeCSS } from "../../vite";

type ResolveIdHook = (
  this: { resolve: jest.Mock },
  source: string,
  importer: string | undefined,
  options: Record<string, unknown>,
) => Promise<unknown>;

function setup() {
  const plugin = reactNativeCSS();
  const resolve = jest.fn().mockResolvedValue({ id: "/resolved/components" });
  const resolveId = plugin.resolveId as unknown as ResolveIdHook;

  const call = (source: string, importer?: string) =>
    resolveId.call({ resolve }, source, importer, {});

  return { plugin, resolve, call };
}

const rncFile = `${sep}node_modules${sep}react-native-css${sep}dist${sep}components${sep}View.js`;
const appFile = `${sep}app${sep}src${sep}Button.tsx`;

describe("vite resolver", () => {
  it("redirects react-native to react-native-css/components", async () => {
    const { resolve, call } = setup();

    await call("react-native", appFile);

    expect(resolve).toHaveBeenCalledWith(
      "react-native-css/components",
      appFile,
      expect.objectContaining({ skipSelf: true }),
    );
  });

  it("redirects react-native-web, which bundlers alias to before plugins run", async () => {
    const { resolve, call } = setup();

    await call("react-native-web", appFile);

    expect(resolve).toHaveBeenCalledWith(
      "react-native-css/components",
      appFile,
      expect.objectContaining({ skipSelf: true }),
    );
  });

  it("does not redirect imports from react-native-css itself", async () => {
    const { resolve, call } = setup();

    // The components barrel re-exports react-native and each wrapper uses its
    // base component at module scope, so redirecting these would cycle.
    await expect(call("react-native", rncFile)).resolves.toBeNull();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("ignores unrelated specifiers", async () => {
    const { resolve, call } = setup();

    for (const source of [
      "react",
      "react-native-svg",
      "react-native-web/dist/exports/View",
      "./View",
    ]) {
      await expect(call(source, appFile)).resolves.toBeNull();
    }

    expect(resolve).not.toHaveBeenCalled();
  });

  it("registers the same mapping for dependency pre-bundling", () => {
    const { plugin } = setup();

    const config = (
      plugin.config as unknown as () => {
        optimizeDeps: { esbuildOptions: { plugins: { name: string }[] } };
      }
    )();

    expect(config.optimizeDeps.esbuildOptions.plugins).toEqual([
      expect.objectContaining({ name: "react-native-css" }),
    ]);
  });
});
