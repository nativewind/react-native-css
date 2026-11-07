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
  const transforms = createTransformComposition();

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
        transforms.recorderFor(target, ruleTarget, isImportant),
        guards,
        target,
        topLevelTarget,
      );
    }
  }

  for (const delayedStyle of delayedStyles) {
    delayedStyle();
  }

  transforms.compose((value) =>
    resolveValue(value, get, {
      inlineVariables,
      inheritedVariables,
      renderGuards: guards,
      calculateProps,
    }),
  );

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

function isTransformProperty(prop: string | number): prop is TransformProperty {
  return (TRANSFORM_PROPERTIES as readonly (string | number)[]).includes(prop);
}

type TransformSlots = Partial<Record<TransformProperty, StyleDescriptor>>;

interface TransformTarget {
  readonly target: Record<string, any>;
  readonly slots: TransformSlots;
}

type RecordTransform = (
  property: TransformProperty,
  value: StyleDescriptor,
) => void;

/** Each transform property of each style target is a cascade slot of its own, and the slots compose into one `transform` once every declaration has been walked. */
function createTransformComposition() {
  const byPath = new Map<
    string,
    { normal?: TransformTarget; important?: TransformTarget }
  >();

  return {
    recorderFor(
      target: Record<string, any>,
      path: string | readonly string[],
      important: boolean,
    ): RecordTransform {
      return (property, value) => {
        const pathKey = typeof path === "string" ? path : path.join("\0");
        const pair = byPath.get(pathKey) ?? {};
        const side = important ? "important" : "normal";
        const recorded = pair[side] ?? { target, slots: {} };

        recorded.slots[property] = value;
        pair[side] = recorded;
        byPath.set(pathKey, pair);
      };
    },

    compose(resolve: (value: StyleDescriptor) => unknown) {
      for (const { normal, important } of byPath.values()) {
        const destination = important ?? normal;
        const entries = composeTransform(
          { ...normal?.slots, ...important?.slots },
          resolve,
        );

        if (destination !== undefined && entries !== undefined) {
          destination.target.transform = entries;
        }
      }
    },
  };
}

function composeTransform(
  slots: TransformSlots,
  resolve: (value: StyleDescriptor) => unknown,
): unknown[] | undefined {
  let composed: unknown[] | undefined;

  for (const property of TRANSFORM_PROPERTIES) {
    if (!Object.hasOwn(slots, property)) {
      continue;
    }

    const entries = transformEntries(resolve(slots[property]));

    if (entries !== undefined) {
      composed = [...(composed ?? []), ...entries];
    }
  }

  return composed;
}

// A property that resolves to no value is `none` (css-variables-1 §3.1)
function transformEntries(value: unknown): unknown[] | undefined {
  return value === undefined || value === null
    ? undefined
    : [value].flat(Number.POSITIVE_INFINITY);
}

export function applyDeclarations(
  get: Getter,
  declarations: StyleDeclaration[],
  inlineVariables: InlineVariable,
  inheritedVariables: VariableContextValue,
  delayedStyles: (() => void)[] = [],
  recordTransform: RecordTransform = () => undefined,
  guards: RenderGuard[] = [],
  target: Record<string, any> = {},
  topLevelTarget = target,
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
        recordTransform(prop, value);
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
