/* eslint-disable */
import { isStyleDescriptorArray } from "../runtime/utils/style-value";
import type {
  CompilerCollection,
  EasingFunction,
  StyleDeclaration,
  StyleDescriptor,
  StyleFunction,
  StyleRule,
  StyleRuleMapping,
} from "./compiler.types";
import { toRNProperty } from "./selectors";

export type AddFn = ReturnType<typeof buildAddFn>;

export function buildAddFn(
  rule: StyleRule,
  collection: CompilerCollection,
  mapping: StyleRuleMapping,
) {
  let staticDeclarations: Record<string, StyleDescriptor> | undefined;

  function add(
    type: "container",
    property: "container-name",
    value: string[] | false,
  ): void;
  function add(
    type: "transition",
    property: string,
    value: StyleDescriptor,
  ): void;
  function add(type: "style", property: string, value: StyleDescriptor): void;
  function add(
    type: "animation",
    property: string,
    value: StyleDescriptor,
  ): void;
  function add(
    type: string,
    property: string,
    value: StyleDescriptor | EasingFunction[],
  ) {
    if (value === undefined) {
      return;
    }

    let forceTuple = false;

    switch (type) {
      case "container": {
        rule.c ??= [];
        const names = (value as string[]).map((name) => `c:${name}`);
        rule.c.push(...names);
        break;
      }
      case "animation": {
        value = value as StyleDescriptor;

        if (value === undefined) {
          return;
        }

        // We cannot animate variables
        if (property.startsWith("--")) {
          return;
        }

        property = toRNProperty(property);
        const rename = mapping[property] ?? mapping["*"];

        const [styleFunction, delayed, usesVariables] =
          postProcessStyleFunction(value);

        rule.d ??= [];
        rule.a = true;

        if (delayed) {
          rule.d.push([styleFunction as StyleFunction, rename || property, 1]);
        } else {
          rule.d.push([styleFunction as StyleFunction, rename || property]);
        }

        if (usesVariables) {
          rule.dv = 1;
        }

        break;
      }
      // @ts-ignore
      case "transition": {
        rule.a = true;
      }
      case "style": {
        value = value as StyleDescriptor;

        if (value === undefined) {
          return;
        }

        if (property.startsWith("--")) {
          if (
            !property.startsWith("--__rn-css") &&
            !collection.varUsageCount.has(property)
          ) {
            return;
          }
          rule.v ??= [];
          rule.v.push([property.slice(2), value]);
          return;
        }

        property = toRNProperty(property);

        const rename = mapping[property] ?? mapping["*"];

        if (Array.isArray(value) && !isStyleDescriptorArray(value)) {
          rule.d ??= [];
          const [styleFunction, delayed, usesVariables] =
            postProcessStyleFunction(value);

          if (delayed) {
            rule.d.push([
              styleFunction as StyleFunction,
              rename || property,
              1,
            ]);
          } else {
            rule.d.push([styleFunction as StyleFunction, rename || property]);
          }

          if (usesVariables) {
            rule.dv = 1;
          }
        } else if (
          forceTuple ||
          (rename && (rename.length > 1 || !rename[0]!.startsWith("^")))
        ) {
          rule.d ??= [];
          rule.d.push([value, rename || property]);
        } else {
          if (rename) {
            property = rename[0]!.slice(1);
          }

          if (!staticDeclarations) {
            staticDeclarations = {};
            rule.d ??= [];
            rule.d.push(staticDeclarations);
          }
          staticDeclarations[property] = value;
        }
      }
    }
  }

  return add;
}

function postProcessStyleFunction(value: StyleDescriptor): [
  // Function
  StyleDescriptor,
  // Should it be delayed
  boolean,
  // Does it use variables
  boolean,
] {
  if (!Array.isArray(value)) {
    return [value, false, false];
  }

  if (isStyleDescriptorArray(value)) {
    let shouldDelay = false;
    let usesVariables = false;
    const results: StyleDescriptor[] = [];

    for (const v of value) {
      let [result, delayed, variables] = postProcessStyleFunction(v);

      shouldDelay ||= delayed;
      usesVariables ||= variables;
      results.push(result);
    }

    return [results, shouldDelay, usesVariables];
  }

  let [newArgs, shouldDelay, usesVariables] = postProcessStyleFunction(
    value[2],
  );

  shouldDelay ||= value[3] === 1;
  usesVariables ||= value[1] === "var";

  if (shouldDelay) {
    return [
      [value[0], value[1], newArgs as StyleDescriptor[]],
      true,
      usesVariables,
    ];
  }

  return [value, false, false];
}

export const addAnimation_V2 =
  (declarations: StyleDeclaration[]): AddFn =>
  (addType, property, value) => {
    if (value === undefined) return;

    let forceTuple = false;
    let staticDeclarations: Record<string, StyleDescriptor> | undefined;

    switch (addType) {
      case "container":
        return;
      case "animation":
        return;
      case "transition":
      case "style": {
        value = value as StyleDescriptor;

        property = toRNProperty(property);

        // TODO: Support property mapping

        // Animating variables not currently supported
        if (property.startsWith("--")) {
          return;
        }

        if (Array.isArray(value)) {
          const [strippedValue, delayed] = postProcessStyleFunction(value);

          if (delayed) {
            declarations.push([strippedValue as StyleFunction, property, 1]);
          } else {
            declarations.push([strippedValue as StyleFunction, property]);
          }
        } else if (forceTuple) {
          declarations.push([value, property]);
        } else {
          if (!staticDeclarations) {
            staticDeclarations = {};
            declarations ??= [];
            declarations.push(staticDeclarations);
          }
          staticDeclarations[property] = value;
        }

        break;
      }
      default: {
        addType satisfies never;
      }
    }
  };
