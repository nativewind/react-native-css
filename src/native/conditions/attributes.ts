import type { AttributeQuery } from "react-native-css/compiler";

import type { RenderGuard } from "./guards";

/**
 * `guards` is optional because the props are not always the ELEMENT's own.
 *
 * A render guard is checked against `currentProps` on the next render, so it can only speak for
 * the component that owns those props. A container query's attribute condition asks about an
 * ANCESTOR's props, and recording a guard for it would compare the ancestor's value against the
 * descendant's own prop of that name — a mismatch on every render for any element that does not
 * happen to carry the same attribute. That caller subscribes to the container's props observable
 * instead, which is a signal the guard system has no way to express.
 */
export function testAttributes(
  queries: AttributeQuery[],
  props: Record<string, unknown> | undefined | null,
  guards?: RenderGuard[],
) {
  return queries.every((query) => testAttribute(query, props, guards));
}

function testAttribute(
  [type, prop, operator, testValue]: AttributeQuery,
  props: Record<string, unknown> | undefined | null,
  guards?: RenderGuard[],
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

  guards?.push([type, prop, value]);

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
