import type { StyleDescriptor } from "react-native-css/compiler";

import type { SimpleResolveValue } from "./resolve";

/** Each entry of a list resolved on its own, or undefined when one resolves to nothing, which makes the whole declaration invalid at computed-value time (css-variables-1 §3.1) */
export function resolveListEntries(
  resolveValue: SimpleResolveValue,
  list: readonly StyleDescriptor[],
): unknown[] | undefined {
  const resolved = list.map((entry) => resolveValue(entry));

  return resolved.some((entry) => entry === undefined) ? undefined : resolved;
}
