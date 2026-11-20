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
const TRANSFORM_SLOTS = 4;

// A transform property's cascade slot in composition order, or -1. This runs for every dynamic declaration
function transformSlot(prop: string | number): number {
  switch (prop) {
    case "translate":
      return 0;
    case "rotate":
      return 1;
    case "scale":
      return 2;
    case "transform":
      return 3;
    default:
      return -1;
  }
}

/** A transform property's declaration, kept until every rule has been walked */
interface TransformRecord {
  readonly target: Record<string, any>;
  readonly path: string | readonly string[];
  readonly important: boolean;
  readonly slot: number;
  readonly value: StyleDescriptor;
}

/** One style target's slots: the normal ones, then the !important ones */
interface TransformGroup {
  readonly path: string | readonly string[];
  target: Record<string, any>;
  readonly slots: (StyleDescriptor | undefined)[];
}

function samePath(
  a: string | readonly string[],
  b: string | readonly string[],
): boolean {
  if (a === b) return true;
  if (typeof a === "string" || typeof b === "string") return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
  // One declaration, the usual case, has nothing to compose with
  if (records.length === 1) {
    const record = records[0]!;
    const resolved = resolve(record.value);

    if (resolved !== undefined && resolved !== null) {
      const composed: unknown[] = [];
      pushEntries(composed, resolved);
      record.target.transform = composed;
    }
    return;
  }

  // Almost always one group, so a scan beats keying a Map by path
  const groups: TransformGroup[] = [];

  for (let r = 0; r < records.length; r++) {
    const record = records[r]!;
    let group: TransformGroup | undefined;

    for (let g = 0; g < groups.length; g++) {
      if (samePath(groups[g]!.path, record.path)) {
        group = groups[g];
        break;
      }
    }

    if (group === undefined) {
      group = {
        path: record.path,
        target: record.target,
        slots: [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ],
      };
      groups.push(group);
    }

    if (record.important) {
      // The important target is merged over the normal one, so it takes the composed list
      group.target = record.target;
      group.slots[record.slot + TRANSFORM_SLOTS] = record.value;
    } else {
      group.slots[record.slot] = record.value;
    }
  }

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]!;
    let composed: unknown[] | undefined;

    for (let slot = 0; slot < TRANSFORM_SLOTS; slot++) {
      const important = group.slots[slot + TRANSFORM_SLOTS];
      const value = important !== undefined ? important : group.slots[slot];

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
      group.target.transform = composed;
    }
  }
}

// A resolver returns a group for a two-axis function, so entries are spread into the list
function pushEntries(entries: unknown[], value: unknown) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) pushEntries(entries, value[i]);
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
  // A list these declarations write replaces the one an earlier rule declared, so each starts a new list
  const startedLists = new WeakSet<object>();

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

              if (!startedLists.has(previousTarget[previousProp])) {
                previousTarget[previousProp] = [];
                startedLists.add(previousTarget[previousProp]);
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

      const slot = target === originalTarget ? transformSlot(prop) : -1;

      if (slot !== -1) {
        transforms.push({ target, path, important, slot, value });
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
