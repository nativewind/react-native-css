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
  /** The caller has already found value to be a style function */
  isFunction?: boolean,
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

      if (!isFunction && isStyleDescriptorArray(value)) {
        return resolveList(value, get, options);
      }

      const name = (value as StyleFunction)[1];

      const simpleResolve: SimpleResolveValue = (value) => {
        return resolveValue(value, get, options);
      };

      if (name === "var") {
        return varResolver(simpleResolve, value as StyleFunction, get, options);
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
        const resolved = simpleResolve(value[2], castToArray);
        // CSS scale percentages describe a factor, unlike translation percentages.
        const component =
          name === "scaleX" || name === "scaleY" || name === "scale"
            ? scaleFactor(resolved)
            : resolved;

        return component === undefined || component === null
          ? null
          : { [name]: component };
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
  // Classify the first entry once: a style function is a token, any other
  // array is an item of a comma-separated list. Only an array led by a plain
  // object needs isStyleFunction's Object.keys, and resolveValue is told the
  // answer so it does not pay for it twice.
  const first = list[0];
  let isCommaSeparated = false;
  let firstIsFunction = false;

  if (Array.isArray(first)) {
    const lead: unknown = first[0];
    if (
      typeof lead === "object" &&
      lead !== null &&
      !Array.isArray(lead) &&
      isStyleFunction(first)
    ) {
      firstIsFunction = true;
    } else {
      isCommaSeparated = true;
    }
  }

  if (!isCommaSeparated && list.length === 1) {
    // Fast path for a lone token: its list, if it resolves to one, is the value
    const resolved: unknown = resolveValue(first, get, options, firstIsFunction);
    return Array.isArray(resolved)
      ? resolved
      : resolved === undefined
        ? []
        : [resolved];
  }

  // Allocated only once the list turns out to be comma-separated
  let items: unknown[][] | undefined = isCommaSeparated ? [] : undefined;
  let item: unknown[] = [];

  // Indexed loops and the inlined common case of appendList: this runs for
  // every list on every render, and Hermes pays for iterators and calls
  for (let index = 0; index < list.length; index++) {
    const entry = list[index];

    if (isCommaSeparated && (index === 0 || isItem(entry))) {
      const tokens = entry as StyleDescriptor[];

      // In a comma-separated list the item is empty here, as each entry closes it
      if (tokens.length === 1) {
        // Fast path for a one-token item, as most are: no item to build and reset
        const resolved: unknown = resolveValue(tokens[0], get, options);
        if (!Array.isArray(resolved)) {
          if (resolved !== undefined) items!.push([resolved]);
          continue;
        }
        item = appendList(resolved, item, (items ??= []));
      } else {
        for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
          const resolved: unknown = resolveValue(
            tokens[tokenIndex],
            get,
            options,
          );
          if (!Array.isArray(resolved)) {
            if (resolved !== undefined) item.push(resolved);
          } else {
            item = appendList(resolved, item, (items ??= []));
          }
        }
      }
    } else {
      // A lone token in an item's place, or a space-separated list's token
      const resolved: unknown = resolveValue(
        entry,
        get,
        options,
        index === 0 && firstIsFunction,
      );
      if (!Array.isArray(resolved)) {
        if (resolved !== undefined) item.push(resolved);
      } else {
        item = appendList(resolved, item, (items ??= []));
      }
    }

    if (isCommaSeparated && item.length > 0) {
      items!.push(item);
      item = [];
    }
  }

  if (items === undefined || items.length === 0) {
    return item;
  }

  if (item.length > 0) items.push(item);
  return items;
}

/**
 * Whether an entry after the first of a comma-separated list is an item, an
 * array of tokens, rather than a lone token in an item's place. Only a style
 * function, `[{}, name]`, is an array led by a plain object, so the full
 * check runs only for one of those or for a resolved item led by an object,
 * such as `[{ rotate }, "x"]`.
 */
function isItem(entry: StyleDescriptor): entry is StyleDescriptor[] {
  if (!Array.isArray(entry)) return false;
  const lead: unknown = entry[0];
  return (
    typeof lead !== "object" ||
    lead === null ||
    Array.isArray(lead) ||
    !isStyleFunction(entry)
  );
}

/**
 * Substitutes a resolved list into the current item and returns the item
 * later tokens join. A resolved value holds no style functions, so a list led
 * by an array is comma-separated: its first item continues the current one
 * and each later item starts its own. Any other list joins the current item.
 */
function appendList(
  resolved: unknown[],
  item: unknown[],
  items: unknown[][],
): unknown[] {
  if (!Array.isArray(resolved[0])) {
    for (let index = 0; index < resolved.length; index++) {
      item.push(resolved[index]);
    }
    return item;
  }

  for (let index = 0; index < resolved.length; index++) {
    if (index > 0) {
      items.push(item);
      item = [];
    }
    const group = resolved[index] as unknown[];
    for (let valueIndex = 0; valueIndex < group.length; valueIndex++) {
      item.push(group[valueIndex]);
    }
  }

  return item;
}
