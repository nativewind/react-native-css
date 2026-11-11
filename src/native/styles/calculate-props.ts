/* eslint-disable */
import type {
  InlineVariable,
  StyleDeclaration,
  StyleDescriptor,
  StyleRule,
} from "react-native-css/compiler";
import { Specificity as S } from "react-native-css/utilities";

import type { RenderGuard } from "../conditions/guards";
import { applyValue, getDeepPath } from "../objects";
import {
  VAR_SYMBOL,
  type Getter,
  type VariableContextValue,
} from "../reactivity";
import { resolveValue } from "./resolve";

export function calculateProps(
  get: Getter,
  rules: (StyleRule | InlineVariable | VariableContextValue)[],
  guards: RenderGuard[] = [],
  inheritedVariables: VariableContextValue = {
    [VAR_SYMBOL]: true,
  },
  inlineVariables: InlineVariable = {
    [VAR_SYMBOL]: "inline",
  },
) {
  let normal: Record<string, any> | undefined;
  let important: Record<string, any> | undefined;

  const delayedStyles: (() => void)[] = [];
  const transforms: TransformRecord[] = [];

  for (const rule of rules) {
    if (VAR_SYMBOL in rule) {
      if (typeof rule[VAR_SYMBOL] === "string") {
        Object.assign(inlineVariables, rule);
      } else {
        Object.assign(inheritedVariables, rule);
      }
      continue;
    }

    if (rule.v) {
      for (const variable of rule.v) {
        inlineVariables[variable[0]] = variable[1];
      }
    }

    if (rule.d) {
      const isImportant = Boolean(rule.s?.[S.Important]);
      let topLevelTarget = isImportant ? (important ??= {}) : (normal ??= {});
      let target = topLevelTarget;

      const ruleTarget = rule.target || "style";

      if (typeof ruleTarget === "string") {
        target = target[ruleTarget] ??= {};
      } else if (ruleTarget) {
        for (const path of ruleTarget) {
          target = target[path] ??= {};
        }
      }

      applyDeclarations(
        get,
        rule.d,
        inlineVariables,
        inheritedVariables,
        delayedStyles,
        transforms,
        guards,
        target,
        topLevelTarget,
        ruleTarget,
        isImportant,
      );
    }
  }

  for (const delayedStyle of delayedStyles) {
    delayedStyle();
  }

  if (transforms.length > 0) {
    composeTransforms(transforms, (value) =>
      resolveValue(value, get, {
        inlineVariables,
        inheritedVariables,
        renderGuards: guards,
        calculateProps,
      }),
    );
  }

  return {
    normal,
    guards,
    important,
  };
}

// css-transforms-2 §6: an element's transform is its `translate`, then its `rotate`, then its `scale`, then its `transform` list
const TRANSFORM_PROPERTIES = [
  "translate",
  "rotate",
  "scale",
  "transform",
] as const;

type TransformProperty = (typeof TRANSFORM_PROPERTIES)[number];

// Compares, not TRANSFORM_PROPERTIES.includes(): this runs for every dynamic declaration
function isTransformProperty(prop: string | number): prop is TransformProperty {
  return (
    prop === "transform" ||
    prop === "translate" ||
    prop === "rotate" ||
    prop === "scale"
  );
}

type TransformSlots = Partial<Record<TransformProperty, StyleDescriptor>>;

/** A transform property's declaration, kept until every rule has been walked */
interface TransformRecord {
  readonly target: Record<string, any>;
  readonly path: string | readonly string[];
  readonly important: boolean;
  readonly property: TransformProperty;
  readonly value: StyleDescriptor;
}

/**
 * Each transform property of each style target is a cascade slot of its own,
 * and the slots compose into one `transform`. Records arrive in cascade
 * order, so a later one replaces an earlier one, and an !important slot
 * replaces a normal one for the same path.
 */
function composeTransforms(
  records: readonly TransformRecord[],
  resolve: (value: StyleDescriptor) => unknown,
) {
  const byPath = new Map<
    string,
    { target: Record<string, any>; normal: TransformSlots; important: TransformSlots }
  >();

  for (const record of records) {
    const pathKey =
      typeof record.path === "string" ? record.path : record.path.join("\0");
    let slots = byPath.get(pathKey);

    if (slots === undefined) {
      slots = { target: record.target, normal: {}, important: {} };
      byPath.set(pathKey, slots);
    }

    if (record.important) {
      // The important target is merged over the normal one, so it takes the composed list
      slots.target = record.target;
      slots.important[record.property] = record.value;
    } else {
      slots.normal[record.property] = record.value;
    }
  }

  for (const { target, normal, important } of byPath.values()) {
    let composed: unknown[] | undefined;

    for (const property of TRANSFORM_PROPERTIES) {
      const value =
        property in important
          ? important[property]
          : property in normal
            ? normal[property]
            : undefined;

      if (value === undefined) {
        continue;
      }

      const resolved = resolve(value);

      // A property that resolves to no value is `none` (css-variables-1 §3.1)
      if (resolved !== undefined && resolved !== null) {
        pushEntries((composed ??= []), resolved);
      }
    }

    if (composed !== undefined) {
      target.transform = composed;
    }
  }
}

// A resolver returns a group for a two-axis function, so entries are spread into the list
function pushEntries(entries: unknown[], value: unknown) {
  if (Array.isArray(value)) {
    for (const entry of value) pushEntries(entries, entry);
  } else {
    entries.push(value);
  }
}

export function applyDeclarations(
  get: Getter,
  declarations: StyleDeclaration[],
  inlineVariables: InlineVariable,
  inheritedVariables: VariableContextValue,
  delayedStyles: (() => void)[] = [],
  transforms: TransformRecord[] = [],
  guards: RenderGuard[] = [],
  target: Record<string, any> = {},
  topLevelTarget = target,
  path: string | readonly string[] = "style",
  important = false,
) {
  const originalTarget = target;

  for (const declaration of declarations) {
    target = originalTarget;

    if (!Array.isArray(declaration)) {
      // Static styles
      Object.assign(target, declaration);
    } else {
      // Dynamic styles
      let value: any = declaration[0];
      let propPath = declaration[1];
      let prop: string | number;

      if (Array.isArray(propPath)) {
        const [first, ...rest] = propPath;

        if (!first) {
          continue;
        }

        const final = rest.pop();

        if (final) {
          if (first !== "&") {
            topLevelTarget[first] ??= {};
            target = topLevelTarget[first];
          }

          let previousProp: string | number = first;
          let previousTarget = topLevelTarget;

          for (prop of rest) {
            if (prop.startsWith("[") && prop.endsWith("]")) {
              prop = Number(prop.slice(1, -1));

              if (!Array.isArray(previousTarget[previousProp])) {
                previousTarget[previousProp] = [];
                target = previousTarget[previousProp];
              }
            }
            previousTarget = target;
            previousProp = prop;

            target[prop] ??= {};
            target = target[prop];
          }

          prop = final;
        } else {
          target = topLevelTarget;
          prop = first;
        }
      } else {
        prop = propPath;
      }

      if (target === originalTarget && isTransformProperty(prop)) {
        transforms.push({ target, path, important, property: prop, value });
        continue;
      }

      const shouldDelay = declaration[2];

      if (shouldDelay) {
        /**
         * We need to delay the resolution of this value until after all
         * styles have been calculated. But another style might override
         * this value. So we set a placeholder value and only override
         * if the placeholder is preserved
         *
         * This also ensures the props exist, so setValue will properly
         * mutate the props object and not create a new one
         */
        const originalValue = value;
        value = { [prop]: true };

        delayedStyles.push(() => {
          if (getDeepPath(target, prop) === value) {
            delete target[prop];
            value = resolveValue(originalValue, get, {
              inlineVariables,
              inheritedVariables,
              renderGuards: guards,
              calculateProps,
            });
            applyValue(target, prop, value);
          }
        });
      } else {
        value = resolveValue(value, get, {
          inlineVariables,
          inheritedVariables,
          renderGuards: guards,
          calculateProps,
        });
      }

      applyValue(target, prop, value);
    }
  }
}
