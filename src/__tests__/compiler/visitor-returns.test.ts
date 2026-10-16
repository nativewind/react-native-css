import { compile } from "react-native-css/compiler";

interface VisitorCall {
  pass: number;
  visitor: string;
  returned: unknown;
}

const calls: VisitorCall[] = [];

jest.mock("../../compiler/lightningcss-loader", () => {
  const actual = jest.requireActual<
    typeof import("../../compiler/lightningcss-loader")
  >("../../compiler/lightningcss-loader");

  return {
    lightningcssLoader: () => {
      const loaded = actual.lightningcssLoader();
      let pass = 0;

      return {
        ...loaded,
        lightningcss: (options: Parameters<typeof loaded.lightningcss>[0]) => {
          pass++;
          const currentPass = pass;
          const visitor = Object.fromEntries(
            Object.entries(options.visitor ?? {}).map(([name, visit]) => [
              name,
              typeof visit === "function"
                ? (...args: unknown[]) => {
                    const returned: unknown = (
                      visit as (...visitArgs: unknown[]) => unknown
                    )(...args);
                    calls.push({ pass: currentPass, visitor: name, returned });
                    return returned;
                  }
                : visit,
            ]),
          );

          return loaded.lightningcss({ ...options, visitor });
        },
      };
    },
  };
});

beforeEach(() => {
  calls.length = 0;
});

test("the second pass hands lightningcss nothing back", () => {
  compile(`
.a { color: var(--color); width: 10px; }
@media (min-width: 640px) { .b { color: red; } }
`);

  const secondPass = calls.filter((call) => call.pass === 2);

  expect(secondPass.map((call) => call.visitor)).toContain("StyleSheetExit");
  expect(secondPass.filter((call) => call.returned !== undefined)).toEqual([]);
});

test("the first pass hands back only the lengths it converts", () => {
  compile(`.a { width: 10px; height: 2rem; }`);

  const lengths = calls.filter(
    (call) => call.pass === 1 && call.visitor === "Length",
  );

  expect(lengths.map((call) => call.returned)).toEqual([
    undefined,
    { unit: "px", value: 28 },
  ]);
});
