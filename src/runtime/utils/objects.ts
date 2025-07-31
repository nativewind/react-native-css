/* eslint-disable */
import { transformKeys } from "../native/styles/defaults";
import { ShortHandSymbol } from "../native/styles/shorthand";

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
  } else {
    return source?.[paths];
  }
}

export function applyShorthand(value: any) {
  if (value === undefined) {
    return;
  }

  const target = {};
  applyValue(target, "", value);
  return target;
}

export function applyValue(
  target: Record<string, any>,
  prop: string,
  value: any,
) {
  if (value === undefined) {
    return;
  }

  if (transformKeys.has(prop)) {
    if (!Array.isArray(target.transform)) {
      target.transform = [];
    }

    const transform = target.transform.find((t: any) => t[prop] !== undefined);

    if (transform) {
      transform[prop] = value;
    } else {
      target.transform.push({ [prop]: value });
    }
    return;
  } else if (typeof value === "object" && value && ShortHandSymbol in value) {
    for (const entry of value) {
      setDeepPath(target, entry[1], entry[0]);
    }
    return;
  }

  target[prop] = value;
}

export function setDeepPath(
  target: Record<string, any>,
  paths: string | string[],
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
