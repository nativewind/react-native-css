import { StyleDescriptor, StyleFunction } from "../../runtime.types";
import type { ContainerContextRecord } from "../contexts";
import { resolveRuntimeFunction } from "./functions";

export type ResolveOptions = {
  getProp?: (name: string) => StyleDescriptor;
  getVariable: (name: string) => StyleDescriptor;
  getContainer?: (name: string) => ContainerContextRecord | undefined;
  getEm?: () => number;
  castToArray?: boolean;
  previousTransitions?: Set<string | string[]>;
};

export type StyleValueResolver = (
  value: unknown,
  options: ResolveOptions,
) => any;

export type StyleValueSubResolver<T = unknown> = (
  resolveValue: StyleValueResolver,
  value: T,
  options: ResolveOptions,
) => any;

export const resolveValue: StyleValueResolver = (value, options) => {
  switch (typeof value) {
    case "bigint":
    case "symbol":
    case "undefined":
      // These types are not supported
      return;
    case "number":
    case "boolean":
      return value;
    case "string":
      return value.endsWith("px") // Inline vars() might set a value with a px suffix
        ? parseInt(value.slice(0, -2), 10)
        : value;
    case "function":
      return resolveValue(value(), options);
    case "object": {
      if (!Array.isArray(value)) {
        return value;
      }

      if (isDescriptorArray(value)) {
        value = value.flatMap((d) => {
          const value = resolveValue(d, options);
          return value === undefined ? [] : value;
        }) as StyleDescriptor[];

        if (options.castToArray && !Array.isArray(value)) {
          return [value];
        } else {
          return value;
        }
      }

      value = resolveRuntimeFunction(
        resolveValue,
        value as StyleFunction,
        options,
      );

      return options.castToArray && value && !Array.isArray(value)
        ? [value]
        : value;
    }
  }
};

function isDescriptorArray(
  value: StyleDescriptor | StyleDescriptor[],
): value is StyleDescriptor[] {
  if (Array.isArray(value)) {
    /**
     * StyleFunction's always have an object at index 0.
     * We purposefully don't allow StyleDescriptor with an object at index 0
     * because it would be ambiguous with StyleFunction
     */
    return typeof value[0] === "object" ? Array.isArray(value[0]) : true;
  }

  return false;
}
