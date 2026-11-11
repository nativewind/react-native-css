import type { AttributeQuery } from "react-native-css/compiler";

import { asciiLowerCase } from "../../utilities/ascii-case";
import type { RenderGuard } from "./guards";

type AttributeQueryType = AttributeQuery[0];

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
    return isPresent(type, value);
  }

  if (operator === "!") return !value;

  const attribute = attributeText(type, value);
  if (attribute === undefined || testValue === undefined) return false;

  const insensitive = caseSensitivity === "i";
  const actual = insensitive ? asciiLowerCase(attribute) : attribute;
  const expected = insensitive ? asciiLowerCase(testValue) : testValue;

  switch (operator) {
    case "=":
      return actual === expected;
    case "~=":
      return expected !== "" && actual.split(/[\t\n\f\r ]+/).includes(expected);
    case "|=":
      return actual === expected || actual.startsWith(expected + "-");
    case "^=":
      return expected !== "" && actual.startsWith(expected);
    case "$=":
      return expected !== "" && actual.endsWith(expected);
    case "*=":
      return expected !== "" && actual.includes(expected);
    default:
      operator satisfies never;
      return false;
  }
}

// react-native-web writes a dataSet entry as a data-* attribute for every value but null and undefined, while a false prop is an absent boolean attribute
function isPresent(type: AttributeQueryType, value: unknown): boolean {
  return (
    value !== undefined && value !== null && (type === "d" || value !== false)
  );
}

function attributeText(
  type: AttributeQueryType,
  value: unknown,
): string | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return type === "d" && Array.isArray(value) ? value.join(",") : undefined;
}
