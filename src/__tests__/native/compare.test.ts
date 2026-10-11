import type { StyleDescriptor } from "react-native-css/compiler";

import {
  compareMediaFeature,
  testMediaFeatureInterval,
  type MediaInterval,
} from "../../native/conditions/compare";

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

const intervals: [
  label: string,
  condition: MediaInterval,
  value: StyleDescriptor,
  matches: boolean,
][] = [
  ["inside", ["[]", "width", 400, "<", 800, "<"], 600, true],
  ["below", ["[]", "width", 400, "<", 800, "<"], 300, false],
  ["above", ["[]", "width", 400, "<", 800, "<"], 900, false],
  ["on an open bound", ["[]", "width", 400, "<", 800, "<"], 400, false],
  ["on a closed bound", ["[]", "width", 400, "<=", 800, "<"], 400, true],
  ["written descending", ["[]", "width", 800, ">", 400, ">"], 600, true],
  ["unmeasured", ["[]", "width", 400, "<", 800, "<"], undefined, false],
];

test.each(intervals)("an interval %s", (_label, condition, value, matches) => {
  expect(testMediaFeatureInterval(condition, value)).toBe(matches);
});
