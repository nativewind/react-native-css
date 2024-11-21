import type {
  InlineStyle,
  Props,
  StyleRule,
  TransitionAttributes,
  TransitionDeclarations,
  VariableDescriptor,
} from "../runtime.types";
import { testRule } from "./conditions";
import type { VariableContextValue } from "./contexts";
import { inlineStylesMap, styleFamily } from "./globals";
import type { RenderGuard, SideEffect } from "./native.types";
import { buildAnimationSideEffects } from "./reanimated";
import type { ConfigReducerState } from "./reducer";
import type { UseInteropState } from "./useInterop";
import type { Effect } from "./utils/observable";

export type Declarations = Effect &
  TransitionDeclarations & {
    epoch: number;
    normal?: StyleRule[];
    important?: StyleRule[];
    inline?: InlineStyle;
    variables?: VariableDescriptor[][];
    guards: RenderGuard[];
    animation?: NonNullable<StyleRule["a"]>[];
    sideEffects?: SideEffect[];
  };

type DeclarationUpdates = {
  d?: boolean;
  a?: boolean;
  t?: TransitionAttributes[];
  v?: boolean;
};

export function buildDeclarations(
  state: ConfigReducerState,
  componentState: UseInteropState,
  props: Props,
  inheritedVariables: VariableContextValue,
): Declarations {
  const previous = state.declarations;
  const source = props?.[state.source] as string | undefined;
  const target: InlineStyle =
    typeof state.target === "string" ? props?.[state.target] : undefined;

  const guards: RenderGuard[] = [
    { type: "prop", name: state.source, value: source },
  ];

  if (state.target !== false) {
    guards.push({ type: "prop", name: state.target, value: target });
  }

  const next: Declarations = {
    epoch: previous?.epoch ?? 0,
    guards,
    run: () => {
      componentState.dispatch([
        { action: { type: "update-definitions" }, index: state.index },
      ]);
    },
    dependencies: new Set(),
    get(readable) {
      return readable.get(next);
    },
  };

  if (!source) {
    return next;
  }

  let updates: DeclarationUpdates | undefined;

  for (const className of source.split(/\s+/)) {
    const styleRuleSet = next.get(styleFamily(className));
    if (!styleRuleSet) {
      continue;
    }

    updates = collectRules(
      "normal",
      componentState,
      updates,
      styleRuleSet[0],
      next,
      previous,
    );

    updates = collectRules(
      "important",
      componentState,
      updates,
      styleRuleSet[1],
      next,
      previous,
    );
  }

  if (typeof target === "object") {
    updates = collectRules(
      "inline",
      componentState,
      updates,
      target,
      next,
      previous,
    );
  }

  if (updates) {
    // If a rule or animation property changed, increment the epoch
    next.epoch++;

    // If the animation's changed, then we need to update the animation side effects
    if (updates.a) {
      buildAnimationSideEffects(next, previous, inheritedVariables);
    }

    if (updates.t?.length) {
      // Flatten the transition attributes
      next.transition = Object.assign({}, ...updates.t);
    }
  }

  return next;
}

/**
 * Mutates the collection with valid style rules
 * @param styleRules
 * @param collection
 * @returns
 */
function collectRules(
  key: "normal" | "inline" | "important",
  componentState: UseInteropState,
  updates: DeclarationUpdates | undefined,
  styleRules: StyleRule[] | InlineStyle | undefined,
  next: Declarations,
  previous: Declarations | undefined,
) {
  if (key === "inline") {
    styleRules = extractInlineStyleRules(styleRules as InlineStyle);
    key = "normal";
  } else {
    styleRules = styleRules as StyleRule[];
  }

  if (!styleRules) {
    if (previous?.[key] !== undefined) {
      updates ??= {};
      updates.d = true;
    }
    return updates;
  }

  let dIndex = next[key] ? Math.max(0, next[key]!.length - 1) : 0;
  let aIndex = next.animation ? Math.max(0, next.animation.length - 1) : 0;
  let vIndex = next.variables ? Math.max(0, next.variables.length - 1) : 0;

  for (const rule of styleRules) {
    if (!testRule(rule, componentState.key, next)) continue;

    if (rule.a) {
      next.animation ??= [];
      next.animation.push(rule.a);
      /**
       * Changing any animation property will restart all animations
       * TODO: This is not entirely accurate, Chrome does not restart animations
       *       This is fine during this experimental stage, but we should fix this in the future
       */
      updates ??= {};
      updates.a ||= !Object.is(previous?.animation?.[aIndex], rule.a);
      aIndex++;
    }

    if (rule.t) {
      updates ??= {};
      updates.t ||= [];
      updates.t.push(rule.t);
      aIndex++;
    }

    if (rule.d) {
      next[key] ??= [];
      next[key]!.push(rule);
      updates ??= {};
      updates.d ||= !Object.is(previous?.[key]?.[dIndex], rule);
      dIndex++;
    }

    if (rule.v) {
      next.variables ??= [];
      next.variables.push(rule.v);
      updates ??= {};
      updates.v ||= !Object.is(previous?.variables?.[vIndex], rule);
      vIndex++;
    }
  }

  return updates;
}

function extractInlineStyleRules(
  inline: InlineStyle,
  collection: StyleRule[] = [],
): StyleRule[] {
  if (typeof inline !== "object" || !inline) {
    return collection;
  }

  if (!Array.isArray(inline)) {
    const styleRule = inlineStylesMap.get(inline);
    if (styleRule) {
      if (styleRule[0]) collection.push(...styleRule[0]);
      if (styleRule[1]) collection.push(...styleRule[1]);
    }
    return collection;
  }

  for (const item of inline) {
    extractInlineStyleRules(item, collection);
  }

  return collection;
}
