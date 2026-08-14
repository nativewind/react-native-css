import { compile, type ContainerQuery } from "react-native-css/compiler";

/**
 * Returns the container queries the compiler attached to `.child`.
 *
 * The rest of the rule (declarations, specificity, extracted variables) is not
 * the subject of these tests, so reading just `cq` keeps them from failing on
 * an unrelated change to how declarations are emitted.
 */
function compileContainerQueries(condition: string): ContainerQuery[] {
  const stylesheet = compile(`
    @container ${condition} {
      .child {
        color: red;
      }
    }
  `).stylesheet();

  const rules = stylesheet.s?.flatMap(([className, ruleSet]) => {
    return className === "child" ? ruleSet : [];
  });

  return rules?.flatMap((rule) => rule.cq ?? []) ?? [];
}

describe("size feature comparisons", () => {
  /**
   * lightningcss normalises the `min-`/`max-` prefixes into range conditions,
   * so the runtime only ever sees the five comparison operators. Every one of
   * them has to survive compilation with its own identity — a container query
   * evaluator can only be as correct as the operator it is handed.
   */
  const cases: [condition: string, query: ContainerQuery][] = [
    ["(width > 400px)", { m: [">", "width", 400] }],
    ["(width >= 400px)", { m: [">=", "width", 400] }],
    ["(min-width: 400px)", { m: [">=", "width", 400] }],
    ["(width < 400px)", { m: ["<", "width", 400] }],
    ["(width <= 400px)", { m: ["<=", "width", 400] }],
    ["(max-width: 400px)", { m: ["<=", "width", 400] }],
    ["(width = 400px)", { m: ["=", "width", 400] }],
    ["(height > 400px)", { m: [">", "height", 400] }],
    ["(min-height: 400px)", { m: [">=", "height", 400] }],
    ["(max-height: 400px)", { m: ["<=", "height", 400] }],
    ["(orientation: landscape)", { m: ["=", "orientation", "landscape"] }],
    ["(orientation: portrait)", { m: ["=", "orientation", "portrait"] }],
    [
      "my-container (min-width: 400px)",
      { m: [">=", "width", 400], n: "c:my-container" },
    ],
  ];

  test.each(cases)("@container %s", (condition, query) => {
    expect(compileContainerQueries(condition)).toStrictEqual([query]);
  });
});

test("a container query is only attached to rules inside it", () => {
  const stylesheet = compile(`
    .child {
      color: red;
    }

    @container (min-width: 400px) {
      .child {
        color: blue;
      }
    }
  `).stylesheet();

  const rules = stylesheet.s?.flatMap(([className, ruleSet]) => {
    return className === "child" ? ruleSet : [];
  });

  expect(rules?.map((rule) => rule.cq)).toStrictEqual([
    undefined,
    [{ m: [">=", "width", 400] }],
  ]);
});
