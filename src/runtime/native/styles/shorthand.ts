/* eslint-disable */
import type { StyleDescriptor } from "../../../compiler";
import { isStyleDescriptorArray } from "../../utils";
import { defaultValues } from "./defaults";
import type { StyleResolver } from "./resolve";

type ShorthandType =
  | "string"
  | "number"
  | "length"
  | "color"
  | Readonly<(string | Function)[]>;

type ShorthandRequiredValue =
  | readonly [string | readonly string[], ShorthandType]
  | ShorthandDefaultValue;

type ShorthandDefaultValue = readonly [
  string | readonly string[],
  ShorthandType,
  any,
];

export const ShortHandSymbol = Symbol();

export function shorthandHandler(
  mappings: ShorthandRequiredValue[][],
  defaults: ShorthandDefaultValue[],
): StyleResolver {
  return (resolve, value, __, { castToArray }) => {
    let args = isStyleDescriptorArray(value)
      ? resolve(value)
      : Array.isArray(value)
        ? resolve(value[2])
        : value;

    if (!Array.isArray(args)) {
      return;
    }

    args = args.flat();

    if (!Array.isArray(args)) {
      return;
    }

    const match = mappings.find((mapping) => {
      return (
        args.length === mapping.length &&
        mapping.every((map, index) => {
          const type = map[1];
          const value = args[index];

          if (Array.isArray(type)) {
            return type.includes(value) || type.includes(typeof value);
          }

          switch (type) {
            case "string":
            case "number":
              return typeof value === type;
            case "color":
              return typeof value === "string" || typeof value === "object";
            case "length":
              return typeof value === "string"
                ? value.endsWith("%")
                : typeof value === "number";
          }

          return;
        })
      );
    });

    if (!match) return;

    const seenDefaults = new Set(defaults);

    return Object.assign(
      [
        ...match.map((map, index): StyleDescriptor => {
          if (map.length === 3) {
            seenDefaults.delete(map);
          }

          let value = args[index];
          if (castToArray && value && !Array.isArray(value)) {
            value = [value];
          }

          return [value, map[0] as StyleDescriptor];
        }),
        ...Array.from(seenDefaults).map((map): StyleDescriptor => {
          let value = defaultValues[map[2]] ?? map[2];
          if (castToArray && value && !Array.isArray(value)) {
            value = [value];
          }

          return [value, map[0]];
        }),
      ],
      { [ShortHandSymbol]: true },
    );
  };
}
