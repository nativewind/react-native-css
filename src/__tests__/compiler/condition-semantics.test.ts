import type {
  ContainerCondition as CSSContainerCondition,
  MediaCondition as CSSMediaCondition,
} from "lightningcss";
import { compile, type StyleRule } from "react-native-css/compiler";

import { parseContainerCondition } from "../../compiler/container-query";
import { parseMediaQueryCondition } from "../../compiler/media-query";
import { StylesheetBuilder } from "../../compiler/stylesheet";

function compileChildConditions(css: string): Pick<StyleRule, "m" | "cq">[] {
  return (compile(css).stylesheet().s ?? []).flatMap(([className, rules]) =>
    className === "child" ? rules.map(({ m, cq }) => ({ m, cq })) : [],
  );
}

// CSS Conditional 5 §5.4: an unknown size feature or an unresolvable value selects no container
test.each([
  "@container (fictional-feature > 10px)",
  "@container (fictional-feature > 10px) or (width > 400px)",
  "@container not (fictional-feature > 10px)",
  "@container (width > env(safe-area-inset-top))",
  "@container (width > env(safe-area-inset-top)) or (width > 400px)",
])("%s emits no block", (prelude) => {
  expect(
    compileChildConditions(`${prelude} { .child { color: red } }`),
  ).toStrictEqual([]);
});

// An unknown keeps an `and` or a `not` unknown (MQ5 §3.1), so a condition no device can make true compiles to no rule
test.each([
  "@container style(--foo: bar)",
  "@container not style(--foo: bar)",
  "@container style(--foo: bar) and (width > 400px)",
  "@media (width > env(safe-area-inset-top))",
  "@media not (width: env(safe-area-inset-top))",
  "@media (orientation: bogus)",
  "@media not (orientation: bogus)",
  "@media not ((width > 100px) or (orientation: bogus))",
  "@media not (env(safe-area-inset-top) < width < env(safe-area-inset-bottom))",
  "@media not (env(safe-area-inset-top) < width < 800px)",
  "@media not (400px < width < env(safe-area-inset-bottom))",
  "@media not ((env(safe-area-inset-top) < width < 800px) or (width < 0px))",
])("%s, which no device can make true, emits no block", (prelude) => {
  expect(
    compileChildConditions(`${prelude} { .child { color: red } }`),
  ).toStrictEqual([]);
});

test.each<[string, Pick<StyleRule, "m" | "cq">]>([
  [
    "@container style(--foo: bar) or (width > 400px)",
    { m: undefined, cq: [{ m: ["|", [["?"], [">", "width", 400]]] }] },
  ],
  [
    "@media (width > env(safe-area-inset-top)) or (width > 400px)",
    { m: [["|", [["?"], [">", "width", 400]]]], cq: undefined },
  ],
  [
    "@container (width > 10ch) or (width > 100px)",
    {
      m: undefined,
      cq: [
        {
          m: [
            "|",
            [
              [">", "width", null],
              [">", "width", 100],
            ],
          ],
        },
      ],
    },
  ],
  [
    "@media not (400px < width < 800px)",
    { m: [["!", ["[]", "width", 400, "<", 800, "<"]]], cq: undefined },
  ],
  [
    "@container (width > 10em)",
    { m: undefined, cq: [{ m: [">", "width", [{}, "em", 10, 1]] }] },
  ],
  [
    "@media (constructor: x)",
    { m: [["=", "constructor", "x"]], cq: undefined },
  ],
  ["@media (grid: 0)", { m: [["=", "grid", 0]], cq: undefined }],
  ["@media (grid: 1)", { m: [["=", "grid", 1]], cq: undefined }],
])("%s compiles to %j", (prelude, conditions) => {
  expect(
    compileChildConditions(`${prelude} { .child { color: red } }`),
  ).toStrictEqual([conditions]);
});

test("a media query list keeps the branch a device can match beside one none can", () => {
  expect(
    compileChildConditions(
      "@media (width > env(safe-area-inset-top)), (width > 400px) { .child { color: red } }",
    ),
  ).toStrictEqual([{ m: [[">", "width", 400]], cq: undefined }]);
});

// lightningcss 1.33's error recovery emits <general-enclosed> as a condition the 1.30 types do not list, which MQ5 §3.1 leaves unknown
const UNLISTED_CONDITIONS = [
  ["condition", { type: "unknown", value: [] }],
  ["operator", { type: "operation", operator: "xor", conditions: [] }],
] as const;

test.each(UNLISTED_CONDITIONS)(
  "a media %s lightningcss's types do not list compiles to an unknown term",
  (_, unlisted) => {
    const condition: unknown = unlisted;

    expect(
      parseMediaQueryCondition(
        condition as CSSMediaCondition,
        new StylesheetBuilder({}),
      ),
    ).toStrictEqual(["?"]);
  },
);

test.each(UNLISTED_CONDITIONS)(
  "a container %s lightningcss's types do not list selects no container",
  (_, unlisted) => {
    const condition: unknown = unlisted;

    expect(
      parseContainerCondition(
        condition as CSSContainerCondition,
        new StylesheetBuilder({}),
      ),
    ).toBeUndefined();
  },
);
