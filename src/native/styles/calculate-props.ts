/* eslint-disable */
import type {
  InlineVariable,
  StyleDeclaration,
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
import { ShortHandSymbol } from "./constants";
import { transformKeys } from "./defaults";
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
  const transformStyles: (() => void)[] = [];
  const cascade = createCascade();

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
      let topLevelTarget = rule.s?.[S.Important]
        ? (important ??= {})
        : (normal ??= {});
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
        transformStyles,
        guards,
        target,
        topLevelTarget,
        cascade,
      );
    }
  }

  for (const delayedStyle of delayedStyles) {
    delayedStyle();
  }

  for (const transformStyle of transformStyles) {
    transformStyle();
  }

  return {
    normal,
    guards,
    important,
  };
}

// The cascade position of the declaration that last set each key of each target, since a deferred declaration resolves after every later one
interface Cascade {
  readonly writers: WeakMap<object, Map<string | number, number>>;
  readonly next: () => number;
}

function createCascade(): Cascade {
  let position = 0;

  return { writers: new WeakMap(), next: () => position++ };
}

function claim(
  cascade: Cascade,
  target: object,
  key: string | number,
  position: number,
): boolean {
  let writers = cascade.writers.get(target);

  if (writers === undefined) {
    writers = new Map();
    cascade.writers.set(target, writers);
  }

  const holder = writers.get(key);

  if (holder !== undefined && holder > position) {
    return false;
  }

  writers.set(key, position);
  return true;
}

function isShorthandObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && ShortHandSymbol in value
  );
}

// A shorthand learns its keys only once it resolves, so each key is claimed on its own
function applyInCascade(
  cascade: Cascade,
  target: Record<string, any>,
  prop: string | number,
  value: unknown,
  position: number,
) {
  if (!isShorthandObject(value)) {
    if (claim(cascade, target, prop, position)) {
      applyValue(target, prop as string, value);
    }
    return;
  }

  const kept: Record<string | symbol, unknown> = { [ShortHandSymbol]: true };

  for (const [key, keyValue] of Object.entries(value)) {
    if (claim(cascade, target, key, position)) {
      kept[key] = keyValue;
    }
  }

  applyValue(target, prop as string, kept);
}

export function applyDeclarations(
  get: Getter,
  declarations: StyleDeclaration[],
  inlineVariables: InlineVariable,
  inheritedVariables: VariableContextValue,
  delayedStyles: (() => void)[] = [],
  transformStyles: (() => void)[] = [],
  guards: RenderGuard[] = [],
  target: Record<string, any> = {},
  topLevelTarget = target,
  cascade: Cascade = createCascade(),
) {
  for (const declaration of declarations) {
    // Each declaration's own binding, since its deferred closure runs after the walk has moved on
    let declarationTarget = target;
    const position = cascade.next();

    if (!Array.isArray(declaration)) {
      // Static styles
      for (const key of Object.keys(declaration)) {
        claim(cascade, declarationTarget, key, position);
      }

      Object.assign(declarationTarget, declaration);
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
            declarationTarget = topLevelTarget[first];
          }

          let previousProp: string | number = first;
          let previousTarget = topLevelTarget;

          for (prop of rest) {
            if (prop.startsWith("[") && prop.endsWith("]")) {
              prop = Number(prop.slice(1, -1));

              if (!Array.isArray(previousTarget[previousProp])) {
                previousTarget[previousProp] = [];
                declarationTarget = previousTarget[previousProp];
              }
            }
            previousTarget = declarationTarget;
            previousProp = prop;

            // A shorthand that resolves late writes this key whole, so a path through it holds it too
            claim(cascade, declarationTarget, prop, position);
            declarationTarget[prop] ??= {};
            declarationTarget = declarationTarget[prop];
          }

          prop = final;
        } else {
          declarationTarget = topLevelTarget;
          prop = first;
        }
      } else {
        prop = propPath;
      }

      if (transformKeys.has(prop)) {
        const originalValue = value;
        // An object keyed by the prop lets the transform array find this entry
        value = { [prop]: true };

        transformStyles.push(() => {
          value = resolveValue(originalValue, get, {
            inlineVariables,
            inheritedVariables,
            renderGuards: guards,
            calculateProps,
          });
          applyValue(declarationTarget, prop, value);
        });

        applyValue(declarationTarget, prop, value);
      } else if (declaration[2]) {
        const originalValue = value;
        // Resolved once every declaration is walked; a later declaration of the same key replaces the placeholder
        const placeholder = { [prop]: true };

        delayedStyles.push(() => {
          if (getDeepPath(declarationTarget, prop) === placeholder) {
            delete declarationTarget[prop];
            applyInCascade(
              cascade,
              declarationTarget,
              prop,
              resolveValue(originalValue, get, {
                inlineVariables,
                inheritedVariables,
                renderGuards: guards,
                calculateProps,
              }),
              position,
            );
          }
        });

        applyInCascade(cascade, declarationTarget, prop, placeholder, position);
      } else {
        applyInCascade(
          cascade,
          declarationTarget,
          prop,
          resolveValue(value, get, {
            inlineVariables,
            inheritedVariables,
            renderGuards: guards,
            calculateProps,
          }),
          position,
        );
      }
    }
  }
}
