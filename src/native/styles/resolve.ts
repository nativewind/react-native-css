/* eslint-disable */

import type {
  InlineVariable,
  StyleDescriptor,
  StyleFunction,
} from "react-native-css/compiler";
import {
  isCommaList,
  isStyleDescriptorArray,
} from "react-native-css/utilities";

import type { RenderGuard } from "../conditions/guards";
import { type Getter, type VariableContextValue } from "../reactivity";
import type { calculateProps } from "./calculate-props";
import { transformKeys } from "./defaults";
import * as functions from "./functions";
import { lineHeight } from "./line-height";
import { scaleFactor } from "./scale-factor";
import * as shorthands from "./shorthands";
import { em, rem, vh, vw } from "./units";
import { varResolver } from "./variables";

export type SimpleResolveValue = (
  value: StyleDescriptor,
  castToArray?: boolean,
) => unknown;

export type StyleFunctionResolver = (
  resolveValue: SimpleResolveValue,
  value: StyleFunction,
  get: Getter,
  options: ResolveValueOptions,
) => unknown;

export type StyleResolver = (
  resolveValue: SimpleResolveValue,
  value: StyleDescriptor,
  get: Getter,
  options: ResolveValueOptions,
) => unknown;

const functionResolvers = {
  ...shorthands,
  ...functions,
  lineHeight,
  em,
  rem,
  vh,
  vw,
};

export type ResolveValueOptions = {
  castToArray?: boolean;
  inheritedVariables?: VariableContextValue;
  inlineVariables?: InlineVariable | undefined;
  renderGuards?: RenderGuard[];
  variableHistory?: Set<string>;
  variableCycles?: Set<string>;
  /** Pass down to perform recursive calculations and avoid circular dependencies */
  calculateProps?: typeof calculateProps;
};

export function resolveValue(
  value: StyleDescriptor,
  get: Getter,
  options: ResolveValueOptions,
): any {
  const { castToArray } = options;

  switch (typeof value) {
    case "bigint":
    case "symbol":
    case "undefined":
    case "function":
      // These types are not supported
      return;
    case "number":
    case "boolean":
      return value;
    case "string": {
      if (value === "unset") {
        return null;
      } else if (value.endsWith("px")) {
        // Inline vars() might set a value with a px suffix
        return parseFloat(value.slice(0, -2));
      } else {
        return value;
      }
    }
    case "object": {
      if (!Array.isArray(value)) {
        return value;
      }

      if (isStyleDescriptorArray(value)) {
        return resolveList(value, get, options);
      }

      const name = value[1];

      const simpleResolve: SimpleResolveValue = (value) => {
        return resolveValue(value, get, options);
      };

      if (name === "var") {
        return varResolver(simpleResolve, value, get, options);
      } else if (name in functionResolvers) {
        const fn = functionResolvers[name as keyof typeof functionResolvers];

        if (typeof fn !== "function") {
          throw new Error(`Unknown function: ${name}`);
        }

        value = fn(
          simpleResolve,
          value as StyleFunction,
          get,
          options,
        ) as StyleDescriptor;
      } else if (transformKeys.has(name)) {
        // translate, rotate, scale, etc.
        let resolved = simpleResolve(value[2], castToArray);
        // CSS scale percentages describe a factor, unlike translation percentages.
        if (
          (name === "scaleX" || name === "scaleY" || name === "scale") &&
          typeof resolved === "string" &&
          resolved.endsWith("%")
        ) {
          resolved = scaleFactor(resolved);
        }
        return { [name]: resolved };
      } else {
        let args = simpleResolve(value[2], castToArray);

        if (args === undefined) {
          return;
        } else if (Array.isArray(args)) {
          let joinedArgs = isCommaList(args)
            ? args.map((item: readonly unknown[]) => item.join(" ")).join(", ")
            : args.join(" ");

          if (name === "radial-gradient") {
            // Nativewind / Tailwind CSS hack which can force the 'in oklab' color space
            joinedArgs = joinedArgs.replace("in oklab, ", "");
          }

          value = `${name}(${joinedArgs})`;
        } else {
          value = `${name}(${args})`;
        }
      }

      return castToArray && value && !Array.isArray(value) ? [value] : value;
    }
  }
}

/**
 * Resolves a list descriptor. A comma-separated list holds each item as the
 * array of its tokens; anything else is a space-separated list of tokens.
 *
 * A token that resolves to a list is substituted by its tokens, as
 * css-variables-1 §3 substitutes a var(): a space-separated list joins the
 * current item, and a comma-separated one splits it.
 *
 * Resolved values are resolved again (variables cache them), so the result
 * keeps the same shape: a flat array for a space-separated list, an array of
 * arrays for a comma-separated one.
 */
function resolveList(
  list: StyleDescriptor[],
  get: Getter,
  options: ResolveValueOptions,
): unknown[] {
  const isCommaSeparated = isStyleDescriptorArray(list[0]);

  if (!isCommaSeparated && list.length === 1) {
    // Fast path for a lone token: its list, if it resolves to one, is the value
    const resolved: unknown = resolveValue(list[0], get, options);
    return Array.isArray(resolved)
      ? resolved
      : resolved === undefined
        ? []
        : [resolved];
  }

  const items: unknown[][] = [];
  let item: unknown[] = [];

  for (const entry of list) {
    if (isCommaSeparated && isStyleDescriptorArray(entry)) {
      for (const token of entry) {
        item = appendToken(resolveValue(token, get, options), item, items);
      }
    } else {
      // A lone token in an item's place, or a space-separated list's token
      item = appendToken(resolveValue(entry, get, options), item, items);
    }

    if (isCommaSeparated) {
      if (item.length > 0) items.push(item);
      item = [];
    }
  }

  if (items.length === 0) {
    return item;
  }

  if (item.length > 0) items.push(item);
  return items;
}

/**
 * Appends a resolved token to the current item and returns the item later
 * tokens join. Resolved values hold no style functions, so an array led by an
 * array is a comma-separated list: its first item continues the current one
 * and each later item starts its own.
 */
function appendToken(
  resolved: unknown,
  item: unknown[],
  items: unknown[][],
): unknown[] {
  if (!Array.isArray(resolved)) {
    if (resolved !== undefined) item.push(resolved);
    return item;
  }

  if (!Array.isArray(resolved[0])) {
    for (const value of resolved) item.push(value);
    return item;
  }

  for (let index = 0; index < resolved.length; index++) {
    if (index > 0) {
      items.push(item);
      item = [];
    }
    for (const value of resolved[index] as unknown[]) item.push(value);
  }

  return item;
}
