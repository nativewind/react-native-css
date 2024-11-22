import {
  Mutable,
  type AnimationRule,
  type InlineStyle,
  type Props,
  type StyleRule,
  type TransitionAttributes,
  type VariableDescriptor,
} from "../runtime.types";
import { testRule } from "./conditions";
import type { VariableContextValue } from "./contexts";
import { inlineStylesMap, styleFamily } from "./globals";
import type { RenderGuard, SideEffect } from "./native.types";
import { buildAnimationSideEffects } from "./reanimated";
import type { ConfigReducerState } from "./reducer";
import type { UseInteropState } from "./useInterop";
import { ProduceArray, ProduceRecord } from "./utils/immutability";
import { type Effect } from "./utils/observable";

export type Declarations = Effect & {
  transition?: TransitionAttributes;
  sharedValues?: Map<string, Mutable<any>>;
  epoch: number;
  normal?: StyleRule[];
  important?: StyleRule[];
  inline?: InlineStyle;
  variables?: VariableDescriptor[];
  guards: RenderGuard[];
  animation?: NonNullable<StyleRule["a"]>[];
  sideEffects?: SideEffect[];
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

  // Setup the default guards
  const guards = new ProduceArray(previous?.guards || [], (a, b) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  });

  guards.push(["a", state.source, source]);

  if (state.target !== false) {
    guards.push(["a", state.target, target]);
  }

  const next: Declarations = {
    epoch: previous?.epoch ?? 0,
    guards: [], // Placeholder will be changed later
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
    next.guards = guards.commit();
    return next;
  }

  const normal = new ProduceArray(previous?.normal);
  const important = new ProduceArray(previous?.important);
  const variables = new ProduceArray(previous?.variables);
  const animation = new ProduceArray(previous?.animation);
  const transition = new ProduceRecord(previous?.transition);

  for (const className of source.split(/\s+/)) {
    const styleRuleSet = next.get(styleFamily(className));
    if (!styleRuleSet) {
      continue;
    }

    collectRules(
      normal,
      styleRuleSet[0],
      guards,
      variables,
      animation,
      transition,
      componentState,
      next,
      props,
    );
    collectRules(
      important,
      styleRuleSet[1],
      guards,
      variables,
      animation,
      transition,
      componentState,
      next,
      props,
    );
  }

  if (typeof target === "object") {
    collectRules(
      normal,
      target,
      guards,
      variables,
      animation,
      transition,
      componentState,
      next,
      props,
      true,
    );
  }

  next.animation = animation.commit();
  next.important = important.commit();
  next.normal = normal.commit();
  next.transition = transition.commit();
  next.variables = variables.commit();

  if (next.animation !== previous?.animation) {
    buildAnimationSideEffects(next, previous, inheritedVariables, guards);
  }

  next.guards = guards.commit();

  if (
    next.normal !== previous?.normal ||
    next.important !== previous?.important ||
    next.variables !== previous?.variables ||
    next.animation !== previous?.animation ||
    next.transition !== previous?.transition ||
    next.guards !== previous?.guards
  ) {
    // If a rule or animation property changed, increment the epoch
    next.epoch++;
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
  collection: ProduceArray<StyleRule[] | undefined>,
  styleRules: StyleRule[] | InlineStyle | undefined,
  guards: ProduceArray<RenderGuard[]>,
  variables: ProduceArray<VariableDescriptor[] | undefined>,
  animations: ProduceArray<AnimationRule[] | undefined>,
  transition: ProduceRecord<TransitionAttributes | undefined>,
  componentState: UseInteropState,
  next: Declarations,
  props: Props,
  isInline = false,
) {
  if (isInline) {
    styleRules = extractInlineStyleRules(styleRules as InlineStyle);
  } else {
    styleRules = styleRules as StyleRule[];
  }

  if (!styleRules) {
    return;
  }

  for (const rule of styleRules) {
    if (!testRule(rule, componentState.key, next, props, guards)) continue;

    if (rule.a) {
      animations.push(rule.a);
    }

    if (rule.t) {
      transition.assign(rule.t);
    }

    if (rule.d) {
      collection.push(rule);
    }

    if (rule.v) {
      variables.pushAll(rule.v);
    }
  }
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
