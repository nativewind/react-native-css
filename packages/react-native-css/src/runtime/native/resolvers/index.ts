import { StyleDescriptor, StyleFunction } from "../../runtime.types";
import type { ContainerContextRecord } from "../contexts";
import { Effect } from "../utils/observable";
import { animationShorthand } from "./animation";
import { calc } from "./calc";
import { em, remResolver, vhResolver, vwResolver } from "./units";
import { resolveVariable } from "./variable";

export type ResolveOptions = {
  getProp?: (name: string) => StyleDescriptor;
  getVariable: (name: string) => StyleDescriptor;
  getContainer?: (name: string) => ContainerContextRecord | undefined;
  getEm?: () => number;
  castToArray?: boolean;
  previousTransitions?: Set<string | string[]>;
};

export type StyleValueResolver = (
  value: StyleDescriptor,
  options: ResolveOptions,
  effect?: Effect,
) => any;

export type StyleFunctionResolver = (
  resolveValue: StyleValueResolver,
  value: StyleFunction,
  options: ResolveOptions,
  effect?: Effect,
) => any;

const functions: Record<string, StyleFunctionResolver> = {
  "@animation": animationShorthand,
  calc,
  em,
  rem: remResolver,
  var: resolveVariable,
  vh: vhResolver,
  vw: vwResolver,
};

export const resolveValue: StyleValueResolver = (value, options, effect) => {
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
        value = value.flatMap((d) => {
          const value = resolveValue(d, options, effect);
          return value === undefined ? [] : value;
        }) as StyleDescriptor[];

        if (options.castToArray && !Array.isArray(value)) {
          return [value];
        } else {
          return value;
        }
      }

      const name = value[1];

      if (name in functions) {
        value = functions[name](
          resolveValue,
          value as StyleFunction,
          options,
          effect,
        );
      } else {
        const args = resolveValue(value[2], options, effect);

        if (args === undefined) {
          return;
        } else if (Array.isArray(args)) {
          value = `${name}(${args.join(", ")})`;
        } else {
          value = `${name}(${args})`;
        }
      }

      return options.castToArray && value && !Array.isArray(value)
        ? [value]
        : value;
    }
  }
};

function isDescriptorArray(
  value: StyleDescriptor | StyleDescriptor[],
): value is StyleDescriptor[] {
  return Array.isArray(value) && typeof value[0] === "object"
    ? Array.isArray(value[0])
    : true;
}
