import { act } from "@testing-library/react-native";
import type {
  MediaFeatureComparison,
  MediaFeatureOperand,
} from "react-native-css/compiler";

import {
  compareMediaFeature,
  evaluateCondition,
  isTruthyFeatureValue,
  testMediaFeatureInterval,
  type FeatureReader,
  type MeasuredFeatureValue,
  type MediaFeatureName,
  type MediaInterval,
} from "../../native/conditions/compare";
import { UNKNOWN, type Truth } from "../../native/conditions/kleene";
import { dimensions, type Getter } from "../../native/reactivity";

const get: Getter = (observable) => observable.get();

beforeEach(() => {
  act(() => {
    dimensions.set({ ...dimensions.get(), width: 600, height: 400 });
  });
});

test.each([
  [">", [false, false, true]],
  [">=", [false, true, true]],
  ["<", [true, false, false]],
  ["<=", [true, true, false]],
  ["=", [false, true, false]],
] as const)("%s compares 39, 40 and 41 against 40", (operator, expected) => {
  expect(
    [39, 40, 41].map((value) => compareMediaFeature(operator, value, 40, get)),
  ).toStrictEqual(expected);
});

const operands: readonly (readonly [
  label: string,
  operator: MediaFeatureComparison,
  left: MediaFeatureOperand | undefined,
  right: MediaFeatureOperand,
  truth: Truth,
])[] = [
  ["an unmeasured feature", ">", undefined, 400, UNKNOWN],
  ["an unresolved operand", ">", 400, null, UNKNOWN],
  ["an operand only an element resolves", ">", 400, [{}, "em", 10, 1], UNKNOWN],
  ["a viewport width on a 600px window", ">", 400, [{}, "vw", 50, 1], true],
  ["a viewport height on a 400px window", "=", 200, [{}, "vh", 50, 1], true],
  ["a viewport length on either side", "<", [{}, "vh", 50, 1], 201, true],
  ["a keyword ordered against a number", ">", "landscape", 400, UNKNOWN],
  ["an equal keyword", "=", "landscape", "landscape", true],
  ["a different keyword", "=", "portrait", "landscape", false],
];

test.each(operands)("%s", (_label, operator, left, right, truth) => {
  expect(compareMediaFeature(operator, left, right, get)).toBe(truth);
});

const intervals: readonly (readonly [
  label: string,
  condition: MediaInterval,
  value: MeasuredFeatureValue,
  truth: Truth,
])[] = [
  ["inside", ["[]", "width", 400, "<", 800, "<"], 600, true],
  ["below", ["[]", "width", 400, "<", 800, "<"], 300, false],
  ["above", ["[]", "width", 400, "<", 800, "<"], 900, false],
  ["on an open bound", ["[]", "width", 400, "<", 800, "<"], 400, false],
  ["on a closed bound", ["[]", "width", 400, "<=", 800, "<"], 400, true],
  ["written descending", ["[]", "width", 800, ">", 400, ">"], 600, true],
  ["unmeasured", ["[]", "width", 400, "<", 800, "<"], undefined, UNKNOWN],
  [
    "with an unresolved bound",
    ["[]", "width", null, "<", 800, "<"],
    600,
    UNKNOWN,
  ],
  ["false on one bound", ["[]", "width", 700, "<", null, "<"], 600, false],
  [
    "between viewport lengths",
    ["[]", "width", [{}, "vw", 50, 1], "<", [{}, "vw", 150, 1], "<"],
    600,
    true,
  ],
];

test.each(intervals)("an interval %s", (_label, condition, value, truth) => {
  expect(testMediaFeatureInterval(condition, value, get)).toBe(truth);
});

test.each([
  [400, true],
  [0, false],
  [Number.NaN, false],
  ["hover", true],
  ["none", false],
  ["no-preference", false],
  [undefined, UNKNOWN],
] as const)("%p in a boolean context is %p", (value, truth) => {
  expect(isTruthyFeatureValue(value)).toBe(truth);
});

const recordingReader = (
  values: Readonly<Partial<Record<MediaFeatureName, MeasuredFeatureValue>>>,
  read: MediaFeatureName[],
): FeatureReader<undefined> => ({
  read: (name) => {
    read.push(name);
    return values[name];
  },
  compare: (condition) => {
    read.push(condition[1]);
    return condition[0] === "[]"
      ? testMediaFeatureInterval(condition, values[condition[1]], get)
      : compareMediaFeature(
          condition[0],
          values[condition[1]],
          condition[2],
          get,
        );
  },
});

test("an empty conjunction is true and an empty disjunction false", () => {
  const reader = recordingReader({}, []);

  expect(evaluateCondition(["&", []], reader, undefined)).toBe(true);
  expect(evaluateCondition(["|", []], reader, undefined)).toBe(false);
});

test("a decided term stops the evaluation, and an unknown one does not", () => {
  const read: MediaFeatureName[] = [];
  const reader = recordingReader({ width: 400, height: 300 }, read);

  expect(
    evaluateCondition(
      [
        "&",
        [
          ["=", "scan", "progressive"],
          [">", "width", 500],
          [">", "height", 100],
        ],
      ],
      reader,
      undefined,
    ),
  ).toBe(false);
  expect(
    evaluateCondition(
      [
        "|",
        [
          ["=", "scan", "progressive"],
          [">", "width", 300],
          [">", "height", 100],
        ],
      ],
      reader,
      undefined,
    ),
  ).toBe(true);
  expect(read).toStrictEqual(["scan", "width", "scan", "width"]);
});
