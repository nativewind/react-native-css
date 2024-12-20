import type { StyleFunctionResolver } from ".";

export const resolveVariable: StyleFunctionResolver = (
  resolveValue,
  func,
  options,
) => {
  const args = func[2];
  if (!args || !args[0]) return;

  const name = resolveValue(args[0], options);

  if (typeof name !== "string") {
    return;
  }

  let value = options.getVariable(name);

  // If there is no value, check for a default value
  if (value === undefined && args[1]) {
    value = resolveValue(args[1], options);
  }

  return value;
};
