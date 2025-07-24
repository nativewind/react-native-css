/* eslint-disable */
import type {
  InlineVariable,
  StyleDescriptor,
  StyleFunction,
} from "../../../compiler";
import type { RenderGuard } from "../conditions/guards";
import { type Getter, type VariableContextValue } from "../reactivity";
import { animation } from "./animation";
import { border } from "./border";
import { boxShadow } from "./box-shadow";
import { calc } from "./calc";
import { transformKeys } from "./defaults";
import {
  fontScale,
  hairlineWidth,
  pixelRatio,
  pixelSizeForLayoutSize,
  platformColor,
  roundToNearestPixel,
} from "./platform-functions";
import { textShadow } from "./text-shadow";
import { transform } from "./transform";
import { em, rem, vh, vw } from "./units";
import { varResolver } from "./variables";

export type SimpleResolveValue = (
  value: StyleDescriptor,
  castToArray?: boolean,
) => any;

export type StyleFunctionResolver = (
  resolveValue: SimpleResolveValue,
  value: StyleFunction,
  get: Getter,
  options: ResolveValueOptions,
) => any;

const shorthands: Record<`@${string}`, StyleFunctionResolver> = {
  "@textShadow": textShadow,
  "@transform": transform,
  "@boxShadow": boxShadow,
  "@border": border,
};

const functions: Record<string, StyleFunctionResolver> = {
  calc,
  em,
  vw,
  vh,
  rem,
  platformColor,
  hairlineWidth,
  pixelRatio,
  fontScale,
  pixelSizeForLayoutSize,
  roundToNearestPixel,
  animationName: animation,
  ...shorthands,
};

export type ResolveValueOptions = {
  castToArray?: boolean;
  inheritedVariables?: VariableContextValue;
  inlineVariables?: InlineVariable | undefined;
  renderGuards?: RenderGuard[];
  variableHistory?: Set<string>;
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
    case "string":
      return value.endsWith("px") // Inline vars() might set a value with a px suffix
        ? parseInt(value.slice(0, -2), 10)
        : value;
    case "object": {
      if (!Array.isArray(value)) {
        return value;
      }

      if (isDescriptorArray(value)) {
        value = value.map((d) => {
          const value = resolveValue(d, get, options);
          return value === undefined ? [] : value;
        }) as StyleDescriptor[];

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
      } else if (name in functions) {
        const fn = functions[name];

        if (typeof fn !== "function") {
          throw new Error(`Unknown function: ${name}`);
        }

        value = fn(simpleResolve, value as StyleFunction, get, options);
      } else if (transformKeys.has(name)) {
        // translate, rotate, scale, etc.
        return simpleResolve(value[2]?.[0], castToArray);
      } else if (transformKeys.has(name.slice(1))) {
        // @translate, @rotate, @scale, etc.
        return { [name.slice(1)]: simpleResolve(value[2], castToArray)[0] };
      } else {
        const args = simpleResolve(value[2], castToArray);
        if (args === undefined) {
          return;
        } else if (Array.isArray(args)) {
          value = `${name}(${args.join(", ")})`;
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
