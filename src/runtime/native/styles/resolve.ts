/* eslint-disable */

import type {
  InlineVariable,
  StyleDescriptor,
  StyleFunction,
} from "../../../compiler";
import type { RenderGuard } from "../conditions/guards";
import { type Getter, type VariableContextValue } from "../reactivity";
import { animation, timingFunctionResolver } from "./animation";
import { border } from "./border";
import { boxShadow } from "./box-shadow";
import { calc } from "./calc";
import type { calculateProps } from "./calculate-props";
import { transformKeys } from "./defaults";
import {
  blur,
  brightness,
  contrast,
  dropShadow,
  grayscale,
  hueRotate,
  invert,
  opacity,
  saturate,
  sepia,
} from "./filters";
import {
  fontScale,
  getPixelSizeForLayoutSize,
  hairlineWidth,
  pixelRatio,
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

const functions: Record<string, StyleFunctionResolver> = {
  "@animation": animation,
  "@border": border,
  "@boxShadow": boxShadow,
  "@textShadow": textShadow,
  "@transform": transform,
  "animationName": animation,
  "cubic-bezier": timingFunctionResolver,
  "steps": timingFunctionResolver,
  "hue-rotate": hueRotate,
  "drop-shadow": dropShadow,
  blur,
  brightness,
  calc,
  contrast,
  em,
  fontScale,
  grayscale,
  hairlineWidth,
  invert,
  opacity,
  pixelRatio,
  getPixelSizeForLayoutSize,
  platformColor,
  rem,
  roundToNearestPixel,
  saturate,
  sepia,
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
    case "string":
      return value.endsWith("px") // Inline vars() might set a value with a px suffix
        ? parseInt(value.slice(0, -2), 10)
        : value;
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
      } else if (name in functions) {
        const fn = functions[name];

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
        const args = value[2];
        return simpleResolve(args, castToArray);
      } else if (transformKeys.has(name.slice(1))) {
        // @translate, @rotate, @scale, etc.
        return { [name.slice(1)]: simpleResolve(value[2], castToArray) };
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
