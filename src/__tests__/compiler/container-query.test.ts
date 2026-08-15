import { compile, type ContainerQuery } from "react-native-css/compiler";

import { sizeComparisons } from "../_media-features";

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
   * Every comparison operator on every size axis, in both spellings.
   *
   * lightningcss normalises the `min-`/`max-` prefixes into range conditions,
   * so the runtime only ever sees the five operators. Every one of them has to
   * survive compilation with its own identity on each axis — an evaluator can
   * only be as correct as the operator and the feature name it is handed, and
   * a table listing a subset of the cross product cannot say which of the two
   * a defect landed on.
   *
   * Generated from the shared census rather than listed, so an operator added
   * to `MediaFeatureComparison` is covered on both axes without an edit here.
   */
  const cases: [condition: string, query: ContainerQuery][] =
    sizeComparisons().map((row) => {
      const query: ContainerQuery = { m: [row.operator, row.feature, 400] };
      return [row.condition(400), query];
    });

  test("the table covers the whole census", () => {
    expect(cases).toHaveLength(sizeComparisons().length);
    expect(cases.length).toBeGreaterThan(0);
  });

  test.each(cases)("@container %s", (condition, query) => {
    expect(compileContainerQueries(condition)).toStrictEqual([query]);
  });
});

describe("other size features", () => {
  const cases: [condition: string, query: ContainerQuery][] = [
    ["(orientation: landscape)", { m: ["=", "orientation", "landscape"] }],
    ["(orientation: portrait)", { m: ["=", "orientation", "portrait"] }],
    // A `<ratio>` is carried to the runtime as the number it denotes, which is
    // what the runtime derives from the container's two axes. A bare number is
    // a ratio too — `1` is `1/1`.
    ["(aspect-ratio > 1)", { m: [">", "aspect-ratio", 1] }],
    ["(aspect-ratio: 2/1)", { m: ["=", "aspect-ratio", 2] }],
    ["(aspect-ratio >= 4/3)", { m: [">=", "aspect-ratio", 4 / 3] }],
    ["(min-aspect-ratio: 16/9)", { m: [">=", "aspect-ratio", 16 / 9] }],
    ["(max-aspect-ratio: 16/9)", { m: ["<=", "aspect-ratio", 16 / 9] }],
    [
      "my-container (min-width: 400px)",
      { m: [">=", "width", 400], n: "c:my-container" },
    ],
  ];

  test.each(cases)("@container %s", (condition, query) => {
    expect(compileContainerQueries(condition)).toStrictEqual([query]);
  });
});

test("each size axis keeps its own identity", () => {
  // Stated differentially: identical syntax on the two axes has to produce two
  // different conditions, so neither axis can be answered with the other's
  // measurement.
  expect(compileContainerQueries("(width > 400px)")).not.toStrictEqual(
    compileContainerQueries("(height > 400px)"),
  );
  expect(compileContainerQueries("(min-width: 400px)")).not.toStrictEqual(
    compileContainerQueries("(min-height: 400px)"),
  );
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

describe("interval (range pair) conditions", () => {
  /**
   * The emitted tuple is `["[]", name, start, startOperator, end,
   * endOperator]`, and it reads in CSS source order: `start startOperator
   * name endOperator end`. The runtime evaluates it in that order, so the
   * two operators are pinned separately from the two bounds — swapping either
   * pair reads as a valid interval and means something else.
   */
  const cases: [condition: string, query: ContainerQuery][] = [
    ["(400px < width < 800px)", { m: ["[]", "width", 400, "<", 800, "<"] }],
    ["(400px <= width <= 800px)", { m: ["[]", "width", 400, "<=", 800, "<="] }],
    ["(800px > width > 400px)", { m: ["[]", "width", 800, ">", 400, ">"] }],
    ["(400px < height < 800px)", { m: ["[]", "height", 400, "<", 800, "<"] }],
    ["(400px <= width < 800px)", { m: ["[]", "width", 400, "<=", 800, "<"] }],
  ];

  test.each(cases)("@container %s", (condition, query) => {
    expect(compileContainerQueries(condition)).toStrictEqual([query]);
  });
});
