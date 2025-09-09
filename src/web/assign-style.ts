/* eslint-disable */
export function assignStyle(
  value: Record<string, any>,
  targets: string[],
  props: Record<string, any>,
) {
  const target = targets.shift();

  if (!target) return {};

  if (targets.length === 0) {
    if (typeof props[target] === "function") {
      const cb = props[target];
      props[target] = (...args: any[]) => {
        return [cb(...args), value];
      };
    } else {
      props[target] = [props[target], value];
    }
    return props;
  } else {
    props[target] ??= {};
    assignStyle(value, targets, props[target]);
    return props;
  }
}
