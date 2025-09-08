/* eslint-disable */
import { ShortHandSymbol } from "../native/styles/constants";
import { transformKeys } from "../native/styles/defaults";

export function getDeepPath(source: any, paths: string | string[] | false) {
  if (!source) {
    return;
  }

  if (paths === false) {
    return undefined;
  }

  if (Array.isArray(paths)) {
    let target = source;

    for (const path of paths) {
      if (typeof target !== "object" || !target || !(path in target)) {
        return undefined;
      }

      target = target[path];
    }

    return target;
  } else if (transformKeys.has(paths)) {
    return Array.isArray(source?.transform)
      ? source.transform.find((t: any) => t[paths] !== undefined)
      : source.transform;
  } else {
    return source?.[paths];
  }
}

export function applyShorthand(value: any) {
  if (value === undefined) {
    return;
  }

  const target: Record<string, unknown> = { [ShortHandSymbol]: true };

  const values = value as [unknown, string][];

  for (const [value, prop] of values) {
    target[prop] = value;
  }

  return target;
}

export function applyValue(
  target: Record<string, any>,
  prop: string,
  value: any,
) {
  // This is confusing.
  // An undefined value means "don't set anything" (something failed while parsing)
  // While a null value means "remove this value", which in React Native means "set to undefined"
  if (value === undefined) {
    return;
  } else if (value === null) {
    value = undefined;
  }

  if (transformKeys.has(prop)) {
    if (!Array.isArray(target.transform)) {
      target.transform = [];
    }

    const transformArray: Record<string, unknown>[] = target.transform;

    // Remove any existing values
    target.transform = transformArray.filter((t) => !(prop in t));

    if (Array.isArray(value)) {
      target.transform.push(...value);
    } else {
      target.transform.push(value);
    }
    return;
  } else if (typeof value === "object" && value && ShortHandSymbol in value) {
    delete value[ShortHandSymbol];
    Object.assign(target, value);
    return;
  }

  target[prop] = value;
}

export function setDeepPath(
  target: Record<string, any>,
  paths: string | string[] | readonly string[],
  value: any,
) {
  if (typeof paths === "string") {
    target[paths] = value;
    return target;
  }

  for (let i = 0; i < paths.length - 1; i++) {
    const path = paths[i]!;
    target[path] ??= {};
    target = target[path];
  }

  target[paths[paths.length - 1]!] = value;

  return target;
}
