/* eslint-disable */

import type {
  InlineVariable,
  StyleDescriptor,
  StyleFunction,
} from "react-native-css/compiler";
import {
  isCommaList,
  isStyleDescriptorArray,
  isStyleFunction,
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
        const first = value[0];

        // An item is an array that does not start as a function does, with its marker object then its name, tested inline as Hermes pays for a call on every list
        return Array.isArray(first) &&
          (typeof first[0] !== "object" ||
            Array.isArray(first[0]) ||
            typeof first[1] !== "string")
          ? resolveCommaList(value, get, options)
          : resolveTokens(value, get, options);
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

/** Resolves the items of a comma-separated list, each the array of its tokens. */
function resolveCommaList(
  list: StyleDescriptor[],
  get: Getter,
  options: ResolveValueOptions,
): unknown[] {
  const items: unknown[] = [];

  for (const tokens of list) {
    // A function is one token though it is an array; a list taken for one is still resolved whole, as resolveValue tells them apart
    const isTokens =
      Array.isArray(tokens) &&
      (typeof tokens[0] !== "object" ||
        Array.isArray(tokens[0]) ||
        typeof tokens[1] !== "string");
    const item = resolveTokens(
      isTokens ? (tokens as StyleDescriptor[]) : [tokens],
      get,
      options,
    );

    if (Array.isArray(item[0])) {
      for (const split of item) items.push(split);
    } else if (item.length > 0) {
      items.push(item);
    }
  }

  return items;
}

/** Resolves a space-separated list's tokens as css-variables-1 §3 substitutes a var(): a list joins it in its place, and a comma-separated one splits it. */
function resolveTokens(
  tokens: StyleDescriptor[],
  get: Getter,
  options: ResolveValueOptions,
): unknown[] {
  if (tokens.length === 1) {
    // A lone token's value is the list
    const resolved: unknown = resolveValue(tokens[0], get, options);
    return Array.isArray(resolved)
      ? resolved
      : resolved === undefined
        ? []
        : [resolved];
  }

  let item: unknown[] = [];
  const items: unknown[][] = [item];
  let isFirst = true;

  for (const token of tokens) {
    const resolved: unknown = resolveValue(token, get, options);

    // Only a function or a nested list can resolve to a list
    if (typeof token !== "object" || !Array.isArray(resolved)) {
      if (resolved !== undefined) item.push(resolved);
    } else if (isFirst && !isStyleFunction(token)) {
      // A list led by an item, which here starts with an object as only a resolved list can, is comma-separated
      return resolveCommaList(tokens, get, options);
    } else if (!Array.isArray(resolved[0])) {
      for (const value of resolved) item.push(value);
    } else {
      // A resolved list holds no functions, so one led by an array is comma-separated: its first item continues this one, each later one starts its own
      let startsItem = false;

      for (const group of resolved) {
        if (startsItem) {
          item = [];
          items.push(item);
        }

        startsItem = true;
        for (const value of group) item.push(value);
      }
    }

    isFirst = false;
  }

  return items.length === 1 ? item : items;
}
