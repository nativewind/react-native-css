import type { AnimationRule, StyleRule, TransitionRule } from "../../compiler";
import type {
  InlineStyle,
  InlineStyleRecord,
  Mutable,
  Props,
} from "../runtime.types";
import { specificityCompareFn } from "../utils";
import { testRule } from "./conditions";
import type { ContainerContextValue, VariableContextValue } from "./contexts";
import { inlineStylesMap, styleFamily } from "./globals";
import type { RenderGuard, SideEffect } from "./native.types";
import { buildAnimationSideEffects } from "./reanimated";
import type { ConfigReducerState } from "./reducer";
import type { UseInteropState } from "./useInterop";
import { ProduceArray, ProduceRecord } from "./utils/immutability";
import { type Effect } from "./utils/observable";

export type Declarations = Effect & {
  transition?: TransitionRule;
  sharedValues?: Map<string, Mutable<any>>;
  epoch: number;
  normal?: (StyleRule | InlineStyleRecord)[];
  important?: StyleRule[];
  variables?: VariableContextValue;
  containers?: ContainerContextValue;
  guards: RenderGuard[];
  animation?: NonNullable<StyleRule["a"]>[];
  sideEffects?: SideEffect[];
};

export function buildDeclarations(
  state: ConfigReducerState,
  componentState: UseInteropState,
  props: Props,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
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

  const normal = new ProduceArray<
    (StyleRule | InlineStyleRecord)[] | undefined
  >(previous?.normal);
  const important = new ProduceArray(previous?.important);
  const variables = new ProduceRecord(previous?.variables);
  const containers = new ProduceRecord(previous?.containers);
  const animation = new ProduceArray(previous?.animation);
  const transition = new ProduceRecord(previous?.transition);

  const unsortedNormal: (StyleRule | InlineStyleRecord)[] = [];
  const unsortedImportant: StyleRule[] = [];

  function collectClassName(className: string) {
    const styleRuleSet = next.get(styleFamily(className));
    if (!styleRuleSet) {
      return;
    }

    collectRules(
      collectClassName,
      unsortedNormal,
      styleRuleSet[0],
      guards,
      variables,
      containers,
      animation,
      transition,
      componentState,
      next,
      inheritedContainers,
      props,
    );
    collectRules(
      collectClassName,
      unsortedImportant,
      styleRuleSet[1],
      guards,
      variables,
      containers,
      animation,
      transition,
      componentState,
      next,
      inheritedContainers,
      props,
    );
  }

  if (typeof source === "string") {
    for (const className of source.split(/\s+/)) {
      collectClassName(className);
    }
  }

  if (typeof target === "object") {
    collectRules(
      collectClassName,
      unsortedNormal,
      target,
      guards,
      variables,
      containers,
      animation,
      transition,
      componentState,
      next,
      inheritedContainers,
      props,
      true,
    );
  }

  next.normal = normal
    .pushAll(unsortedNormal.sort(specificityCompareFn))
    .commit();
  next.important = important
    .pushAll(unsortedImportant.sort(specificityCompareFn))
    .commit();

  next.animation = animation.commit();
  next.transition = transition.commit();
  next.variables = variables.commit();
  next.containers = containers.commit();

  if (next.animation !== previous?.animation) {
    buildAnimationSideEffects(next, previous, inheritedVariables, guards);
  }

  next.guards = guards.commit();

  if (
    next.normal !== previous?.normal ||
    next.important !== previous?.important ||
    next.variables !== previous?.variables ||
    next.containers !== previous?.containers ||
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
  collectClassName: (className: string) => void,
  collection: (StyleRule | InlineStyleRecord)[],
  styleRules: (StyleRule | InlineStyleRecord)[] | InlineStyle | undefined,
  guards: ProduceArray<RenderGuard[]>,
  variables: ProduceRecord<VariableContextValue | undefined>,
  containers: ProduceRecord<ContainerContextValue | undefined>,
  animations: ProduceArray<AnimationRule[] | undefined>,
  transition: ProduceRecord<TransitionRule | undefined>,
  componentState: UseInteropState,
  next: Declarations,
  inheritedContainers: ContainerContextValue,
  props: Props,
  isInline = false,
) {
  if (isInline) {
    styleRules = extractInlineStyleRules(
      collectClassName,
      styleRules as InlineStyle,
    );
  } else {
    styleRules = styleRules as StyleRule[];
  }

  if (!styleRules) {
    return;
  }

  for (const rule of styleRules) {
    if (!rule?.s) {
      // Add inline styles
      collection.push(rule);
      continue;
    }

    if (
      !testRule(
        rule,
        componentState.key,
        next,
        props,
        guards,
        inheritedContainers,
      )
    ) {
      // Skip the rule if it doesn't match the conditions
      continue;
    }

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
      variables.assign(Object.fromEntries(rule.v));
    }

    if (rule.c) {
      containers.assignAll(
        rule.c.map((c) => ({ [`c:${c}`]: componentState.key })),
      );
    }
  }
}

function extractInlineStyleRules(
  collectClassName: (className: string) => void,
  inline: InlineStyle,
  styleRules: (StyleRule | InlineStyleRecord)[] = [],
) {
  if (typeof inline !== "object" || !inline) {
    return styleRules;
  }

  if (Array.isArray(inline)) {
    for (const item of inline) {
      extractInlineStyleRules(collectClassName, item, styleRules);
    }
    return styleRules;
  }

  const styleRule = inlineStylesMap.get(inline);
  if (!styleRule) {
    styleRules.push(inline);
    return styleRules;
  }

  if ("config" in styleRule) {
    for (const className of styleRule.classNames) {
      collectClassName(className);
    }
  } else {
    if (Array.isArray(styleRule[0])) {
      styleRules.push(...styleRule[0]);
    }
  }

  return styleRules;
}
