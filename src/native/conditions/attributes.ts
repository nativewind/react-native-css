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
  [type, prop, operator, testValue]: AttributeQuery,
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

  switch (operator) {
    case "!":
      return !value;
    case "=":
      return value == testValue;
    case "~=":
      return testValue && value?.toString().split(" ").includes(testValue);
    case "|=":
      return testValue && value?.toString().startsWith(testValue + "-");
    case "^=":
      return testValue && value?.toString().startsWith(testValue);
    case "$=":
      return testValue && value?.toString().endsWith(testValue);
    case "*=":
      return testValue && value?.toString().includes(testValue);
    default:
      operator satisfies never;
      return false;
  }
}
