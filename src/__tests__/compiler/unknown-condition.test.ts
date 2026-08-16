import {
  compile,
  type ReactNativeCssStyleSheet,
} from "react-native-css/compiler";

import { serializeStyleSheet } from "../../metro/injection-code";

/**
 * The compiler half of the three-valued contract: a term it cannot compile is
 * emitted as `["?"]` rather than dropped, and that marker has to survive the
 * JSON transport a native bundle carries the stylesheet through.
 */

function conditionsFor(css: string) {
  const rules = compile(css).stylesheet().s?.[0]?.[1];

  if (!Array.isArray(rules)) {
    throw new Error("expected compiled rules");
  }

  return rules.map((rule) =>
    typeof rule === "object" ? (rule.cq ?? rule.m) : rule,
  );
}

const body = `{ .child { color: red; } }`;

describe("an unsupported container feature compiles to an unknown term", () => {
  test("style() alone", () => {
    expect(conditionsFor(`@container style(--foo: bar) ${body}`)).toStrictEqual(
      [[{ m: ["?"] }]],
    );
  });

  test("style() inside a conjunction keeps its slot", () => {
    expect(
      conditionsFor(
        `@container (min-width: 100px) and style(--foo: bar) ${body}`,
      ),
    ).toStrictEqual([[{ m: ["&", [[">=", "width", 100], ["?"]]] }]]);
  });

  test("style() inside a disjunction keeps its slot", () => {
    expect(
      conditionsFor(
        `@container (min-width: 100px) or style(--foo: bar) ${body}`,
      ),
    ).toStrictEqual([[{ m: ["|", [[">=", "width", 100], ["?"]]] }]]);
  });

  test("a negated style() keeps the negation and the term", () => {
    expect(
      conditionsFor(`@container not style(--foo: bar) ${body}`),
    ).toStrictEqual([[{ m: ["!", ["?"]] }]]);
  });
});

/**
 * The marker exists in this shape rather than as `undefined` because the
 * transport cannot carry `undefined`: `JSON.stringify` writes it as `null`
 * inside an array and drops the key entirely on an object. A guard written
 * against `undefined` would hold in a test that injected the compiler's own
 * object and never fire on a device.
 */
test("the unknown marker survives the JSON transport unchanged", () => {
  const stylesheet = compile(
    `@container (min-width: 100px) and style(--foo: bar) ${body}`,
  ).stylesheet();

  const transported = JSON.parse(
    serializeStyleSheet(stylesheet),
  ) as ReactNativeCssStyleSheet;

  expect(transported).toStrictEqual(stylesheet);

  const rules = transported.s?.[0]?.[1];
  if (!Array.isArray(rules)) {
    throw new Error("expected compiled rules");
  }

  expect(rules[0]?.cq).toStrictEqual([
    { m: ["&", [[">=", "width", 100], ["?"]]] },
  ]);
});

/**
 * `undefined` in the same slot is what the marker exists to avoid. This pins
 * the transport's behaviour, so the reason for the marker cannot quietly stop
 * being true.
 */
test("undefined in an array slot becomes null across the transport", () => {
  expect(JSON.parse(serializeStyleSheet([1, undefined, 3]))).toStrictEqual([
    1,
    null,
    3,
  ]);

  expect(JSON.parse(serializeStyleSheet({ m: undefined }))).toStrictEqual({});
});

describe("a media condition the compiler cannot compile keeps its slot", () => {
  test("every media feature form compiles to a term, so no media prelude is dropped", () => {
    // Each of these reaches the runtime as a term rather than as an absent
    // condition: an unknown <mf-name>, a <general-enclosed>, and an operand
    // with no compile-time value.
    expect(
      conditionsFor(`@media (fictional-feature: 3) ${body}`),
    ).toStrictEqual([[["=", "fictional-feature", 3]]]);

    expect(conditionsFor(`@media (fictional-thing) ${body}`)).toStrictEqual([
      [["!!", "fictional-thing"]],
    ]);

    expect(
      conditionsFor(`@media (min-aspect-ratio: 3/4) ${body}`),
    ).toStrictEqual([[[">=", "aspect-ratio", null]]]);
  });
});
