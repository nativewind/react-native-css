import type { AttributeQuery } from "../../../compiler";
import type { Props } from "../../runtime.types";
import type { RenderGuard } from "./guards";

export function testAttributes(
  queries: AttributeQuery[],
  props: Props,
  guards: RenderGuard[],
) {
  return queries.every((query) => testAttribute(query, props, guards));
}

function testAttribute(
  [type, prop, operator, testValue]: AttributeQuery,
  props: Props,
  guards: RenderGuard[],
) {
  let value: unknown;

  if (type === "a") {
    value = props?.[prop];
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    value = props?.dataSet?.[prop];
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
