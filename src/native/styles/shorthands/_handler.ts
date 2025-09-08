/* eslint-disable */
import { isStyleDescriptorArray } from "react-native-css/utilities";

import { setDeepPath } from "../../objects";
import { ShortHandSymbol } from "../constants";
import { defaultValues } from "../defaults";
import type { StyleResolver } from "../resolve";

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

export function shorthandHandler(
  mappings: ShorthandRequiredValue[][],
  defaults: ShorthandDefaultValue[],
  returnType: "shorthandObject" | "tuples" | "object" = "shorthandObject",
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

    const tuples = [
      ...match.map((map, index): [unknown, ShorthandRequiredValue[0]] => {
        if (map.length === 3) {
          seenDefaults.delete(map);
        }

        let value = args[index];
        if (castToArray && value && !Array.isArray(value)) {
          value = [value];
        }

        return [value, map[0]];
      }),
      ...Array.from(seenDefaults).map(
        (map): [unknown, ShorthandRequiredValue[0]] => {
          let value = defaultValues[map[2]] ?? map[2];
          if (castToArray && value && !Array.isArray(value)) {
            value = [value];
          }

          return [value, map[0]];
        },
      ),
    ];

    if (returnType === "shorthandObject" || returnType === "object") {
      const target: Record<string, unknown> =
        returnType === "shorthandObject" ? { [ShortHandSymbol]: true } : {};

      for (const [value, prop] of tuples) {
        if (typeof prop === "string") {
          target[prop] = value;
        } else {
          setDeepPath(target, prop, value);
        }
      }

      return target;
    } else {
      return tuples;
    }
  };
}
