/* eslint-disable */
import type { StyleDescriptor } from "../../../compiler";
import { defaultValues } from "./defaults";
import type { StyleFunctionResolver } from "./resolve";

type ShorthandType =
  | "string"
  | "number"
  | "length"
  | "color"
  | Readonly<string[]>;

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
) {
  const resolveFn: StyleFunctionResolver = (
    resolveValue,
    func,
    _,
    { castToArray },
  ) => {
    const args = func[2] || [];

    const resolved = args.flatMap((value) => {
      return resolveValue(value, castToArray);
    });

    const match = mappings.find((mapping) => {
      return (
        resolved.length === mapping.length &&
        mapping.every((map, index) => {
          const type = map[1];
          const value = resolved[index];

          if (Array.isArray(type)) {
            return type.includes(value);
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

          let value = resolved[index];
          if (castToArray && value && !Array.isArray(value)) {
            value = [value];
          }

          return [value, map[0]];
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

  return resolveFn;
}
