import {
  AnimationDirection,
  AnimationFillMode,
  AnimationPlayState,
  Animation as CSSAnimation,
} from "lightningcss";

import { isStyleDescriptorArray } from "../runtime/utils";
import {
  CompilerCollection,
  EasingFunction,
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
    type: "transform",
    property: string,
    value: StyleDescriptor,
  ): void;
  function add(
    type: "animation",
    property: "animation-timing-function",
    value: EasingFunction[],
  ): void;
  function add(
    type: "animation",
    property:
      | "unparsed-animation"
      | "animation-delay"
      | "animation-direction"
      | "animation-duration"
      | "animation-fill-mode"
      | "animation-iteration-count"
      | "animation-name"
      | "animation-play-state"
      | keyof CSSAnimation,
    value: StyleDescriptor,
  ): void;
  function add(
    type: "transition",
    property: "transition-timing-function",
    value: EasingFunction[],
  ): void;
  function add(
    type: "transition",
    property:
      | "transition-delay"
      | "transition-duration"
      | "transition-property",
    value: StyleDescriptor,
  ): void;
  function add(type: "style", property: string, value: StyleDescriptor): void;
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
      case "transition":
        switch (property) {
          case "transition-timing-function":
            rule.t ??= {};
            rule.t.e ??= [];
            rule.t.e.push(...(value as EasingFunction[]));
            break;
          case "transition-delay":
            rule.t ??= {};
            rule.t.de = value as number[];
            break;
          case "transition-duration":
            rule.t ??= {};
            rule.t.du = value as number[];
            break;
          case "transition-property":
            rule.t ??= {};
            rule.t.p = value as string[];
            break;
        }
        return;
      case "animation":
        let attributes = rule.a?.[0];

        if (!attributes) {
          attributes = {};
          rule.a = [attributes];
        }

        if (property === "unparsed-animation") {
          rule.a![1] = value as StyleFunction;
          return;
        }

        switch (property) {
          case "animation-timing-function":
            attributes.e = value as EasingFunction[];
            break;
          case "animation-delay":
            attributes.de = value as number[];
            break;
          case "animation-direction":
            attributes.di = value as AnimationDirection[];
            break;
          case "animation-duration":
            attributes.du = value as number[];
            break;
          case "animation-fill-mode":
            attributes.f = value as AnimationFillMode[];
            break;
          case "animation-iteration-count":
            attributes.i = value as number[];
            break;
          case "animation-name":
            attributes.n = value as string[];
            break;
          case "animation-play-state":
            attributes.p = value as AnimationPlayState[];
            break;
          case "animation-timeline":
            return;
        }

        return;
      case "transform":
        forceTuple = true;
      case "style": {
        value = value as StyleDescriptor;

        if (value === undefined) {
          return;
        }

        if (property.startsWith("--")) {
          if (!collection.varUsageCount.has(property)) {
            return;
          }
          rule.v ??= [];
          rule.v.push([property.slice(2), value]);
          return;
        }

        property = toRNProperty(property);

        const rename = mapping[property] ?? mapping["*"];

        if (Array.isArray(value)) {
          rule.d ??= [];
          const [strippedValue, delayed] = stripDelay(value);

          if (delayed) {
            rule.d.push([
              strippedValue as StyleFunction,
              rename || property,
              1,
            ]);
          } else {
            rule.d.push([strippedValue as StyleFunction, rename || property]);
          }
        } else if (
          forceTuple ||
          (rename && (rename.length > 1 || !rename[0].startsWith("^")))
        ) {
          rule.d ??= [];
          rule.d.push([value, rename || property]);
        } else {
          if (rename) {
            property = rename[0].slice(1);
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

function stripDelay(value: StyleDescriptor): [StyleDescriptor, boolean] {
  if (!Array.isArray(value)) {
    return [value, false];
  }

  if (isStyleDescriptorArray(value)) {
    let didDelay = false;
    const results: StyleDescriptor[] = [];

    for (const v of value) {
      const [result, delayed] = stripDelay(v);
      if (delayed) {
        didDelay = true;
      }
      results.push(result);
    }

    return [results, didDelay];
  }

  const [newArgs, didArgsDelay] = stripDelay(value[2]);

  const isDelayed = value[3] === 1 || didArgsDelay;

  if (isDelayed) {
    return [[value[0], value[1], newArgs as StyleDescriptor[]], true];
  }

  return [value, false];
}
