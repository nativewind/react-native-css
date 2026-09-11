import type { AttributeQuery } from "react-native-css/compiler";

import type { RenderGuard } from "./guards";

export function testAttributes(
  queries: AttributeQuery[],
  props: Record<string, unknown> | undefined | null,
  guards: RenderGuard[],
) {
  return queries.every((query) => testAttribute(query, props, guards));
}

function testAttribute(
  [type, prop, operator, testValue, caseSensitivity]: AttributeQuery,
  props: Record<string, unknown> | undefined | null,
  guards: RenderGuard[],
) {
  let value: unknown = undefined;

  if (props) {
    if (type === "a") {
      value = props[prop];
    } else {
      const dataSet = props.dataSet as Record<string, unknown> | undefined;
      value = dataSet?.[prop];
    }
  }

  guards.push([type, prop, value]);

  if (!operator) {
    return value !== undefined && value !== null && value !== false;
  }

  if (operator === "!") return !value;
  if (value === undefined || value === null || testValue === undefined)
    return false;

  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  )
    return false;
  let actual = String(value);
  if (caseSensitivity === "i") {
    // CSS attribute flags fold ASCII letters only, not Unicode characters.
    actual = actual.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
    testValue = testValue.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
  }

  switch (operator) {
    case "=":
      return actual === testValue;
    case "~=":
      return (
        testValue !== "" && actual.split(/[\t\n\f\r ]+/).includes(testValue)
      );
    case "|=":
      return actual === testValue || actual.startsWith(testValue + "-");
    case "^=":
      return testValue !== "" && actual.startsWith(testValue);
    case "$=":
      return testValue !== "" && actual.endsWith(testValue);
    case "*=":
      return testValue !== "" && actual.includes(testValue);
    default:
      operator satisfies never;
      return false;
  }
}
