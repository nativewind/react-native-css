/* eslint-disable */

import type {
  InlineVariable,
  StyleDescriptor,
  StyleFunction,
} from "react-native-css/compiler";

import type { RenderGuard } from "../conditions/guards";
import { type Getter, type VariableContextValue } from "../reactivity";
import type { calculateProps } from "./calculate-props";
import { transformKeys } from "./defaults";
import * as functions from "./functions";
import { lineHeight } from "./line-height";
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
        return parseInt(value.slice(0, -2), 10);
      } else {
        return value;
      }
    }
    case "object": {
      if (!Array.isArray(value)) {
        return value;
      }

      if (isDescriptorArray(value)) {
        value = value
          .map((d) => resolveValue(d, get, options))
          .filter((d) => d !== undefined);

        if (castToArray && !Array.isArray(value)) {
          return [value];
        } else {
          return value;
        }
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
        return { [name]: simpleResolve(value[2], castToArray) };
      } else {
        let args = simpleResolve(value[2], castToArray);

        if (args === undefined) {
          return;
        } else if (Array.isArray(args)) {
          let joinedArgs = args
            .map((arg: unknown) => {
              if (Array.isArray(arg)) {
                return arg.flat().join(" ");
              }
              return arg;
            })
            .filter((value) => value !== "/")
            .join(", ");

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

function isDescriptorArray(
  value: StyleDescriptor | StyleDescriptor[],
): value is StyleDescriptor[] {
  return Array.isArray(value) && typeof value[0] === "object"
    ? Array.isArray(value[0])
    : true;
}
