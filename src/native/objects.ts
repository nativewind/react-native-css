/* eslint-disable */
import { ShortHandSymbol } from "../native/styles/constants";
import { transformKeys } from "../native/styles/defaults";

export function getDeepPath(
  source: any,
  paths: string | readonly string[] | false,
) {
  if (!source) {
    return;
  }

  if (paths === false) {
    return undefined;
  }

  if (typeof paths !== "string") {
    return valueAtPath(source, paths);
  } else if (transformKeys.has(paths)) {
    return Array.isArray(source?.transform)
      ? source.transform.find((t: any) => t[paths] !== undefined)
      : source.transform;
  } else {
    return source?.[paths];
  }
}

export function valueAtPath(source: unknown, path: readonly string[]): unknown {
  let value = source;

  for (const key of path) {
    if (typeof value !== "object" || value === null || !(key in value)) {
      return undefined;
    }

    value = Reflect.get(value, key);
  }

  return value;
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

export function isNonArrayObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isPlainObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Writes each value at its path in order, copying each object on the way once however many writes reach it
export function withDeepPaths(
  source: Readonly<Record<string, unknown>>,
  writes: readonly (readonly [readonly string[], unknown])[],
): Readonly<Record<string, unknown>> {
  const copies = new Set<unknown>();
  const isCopy = (value: unknown): value is Record<string, unknown> =>
    copies.has(value);
  const copyOf = (value: unknown): Record<string, unknown> => {
    const copy = { ...(isNonArrayObject(value) ? value : {}) };
    copies.add(copy);
    return copy;
  };

  let result: Record<string, unknown> | undefined;
  for (const [path, value] of writes) {
    const key = path[path.length - 1];
    if (key === undefined) {
      continue;
    }

    result ??= copyOf(source);
    let target = result;
    for (const segment of path.slice(0, -1)) {
      const child = target[segment];
      const next = isCopy(child) ? child : copyOf(child);
      target[segment] = next;
      target = next;
    }
    target[key] = value;
  }

  return result ?? source;
}

export function withoutKeys(
  source: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): Readonly<Record<string, unknown>> {
  return keys.reduce((result, key) => {
    if (!(key in result)) return result;
    const { [key]: removed, ...rest } = result;
    return rest;
  }, source);
}

export function withoutKeysAt(
  source: Readonly<Record<string, unknown>>,
  paths: readonly string[],
  keys: readonly string[],
): Readonly<Record<string, unknown>> {
  const [path, ...rest] = paths;
  if (path === undefined) {
    return withoutKeys(source, keys);
  }

  const child = source[path];
  if (!isNonArrayObject(child)) {
    return source;
  }

  const updated = withoutKeysAt(child, rest, keys);
  return updated === child ? source : { ...source, [path]: updated };
}
