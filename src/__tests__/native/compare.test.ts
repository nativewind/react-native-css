import type {
  MediaFeatureComparison,
  MediaFeatureOperand,
} from "react-native-css/compiler";

import {
  compareMediaFeature,
  isTruthyFeatureValue,
  testMediaFeatureInterval,
  type MeasuredFeatureValue,
  type MediaInterval,
} from "../../native/conditions/compare";
import { UNKNOWN, type Truth } from "../../native/conditions/kleene";

test.each([
  [">", [false, false, true]],
  [">=", [false, true, true]],
  ["<", [true, false, false]],
  ["<=", [true, true, false]],
  ["=", [false, true, false]],
] as const)("%s compares 39, 40 and 41 against 40", (operator, expected) => {
  expect(
    [39, 40, 41].map((value) => compareMediaFeature(operator, value, 40)),
  ).toStrictEqual(expected);
});

const operands: [
  label: string,
  operator: MediaFeatureComparison,
  left: MediaFeatureOperand | undefined,
  right: MediaFeatureOperand,
  truth: Truth,
][] = [
  ["an unmeasured feature", ">", undefined, 400, UNKNOWN],
  ["an unresolved operand", ">", 400, null, UNKNOWN],
  ["an operand only an element resolves", ">", 400, [{}, "em", 10, 1], UNKNOWN],
  ["a keyword ordered against a number", ">", "landscape", 400, UNKNOWN],
  ["an equal keyword", "=", "landscape", "landscape", true],
  ["a different keyword", "=", "portrait", "landscape", false],
];

test.each(operands)("%s", (_label, operator, left, right, truth) => {
  expect(compareMediaFeature(operator, left, right)).toBe(truth);
});

const intervals: [
  label: string,
  condition: MediaInterval,
  value: MeasuredFeatureValue,
  truth: Truth,
][] = [
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
];

test.each(intervals)("an interval %s", (_label, condition, value, truth) => {
  expect(testMediaFeatureInterval(condition, value)).toBe(truth);
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
