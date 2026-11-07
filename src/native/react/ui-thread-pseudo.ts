/* eslint-disable */
import type { StyleRule } from "react-native-css/compiler";

import { DEFAULT_CONTAINER_NAME } from "../conditions/container-query";
import { weakFamily, type ContainerContextValue } from "../reactivity";
import { getStyledTarget } from "../styles";
import type { ComponentState, Config } from "./useNativeCss";

/**
 * `active:` and `group-active:` painted on the UI thread.
 *
 * Reanimated's `setPseudoStyles` registers pseudo-class styles on a host view,
 * so a press is painted by the platform's own touch tracking instead of a React
 * state change: no render, no commit, and no injected `onPress` that turns a
 * `View` into a touch target. The element still resolves its pressed style here,
 * from the same rules and cascade, and hands Reanimated the difference.
 */

type PressSelector = ":active" | ":active-deepest";

interface ReanimatedPseudoSelector {
  selector: PressSelector;
  group?: number;
  style: Record<string, unknown>;
}

interface ReanimatedPseudoConfig {
  defaultStyle?: Record<string, unknown>;
  selectors?: ReanimatedPseudoSelector[];
  hostsGroup?: number;
  transition?: Record<string, unknown>;
}

interface ReanimatedPseudoApi {
  setPseudoStyles: (
    instance: object,
    config: ReanimatedPseudoConfig | null,
  ) => void;
  createPseudoGroup: () => number;
}

let pseudoApi: ReanimatedPseudoApi | null | undefined;

/** Reanimated's host pseudo-style API, or `undefined` when the installed Reanimated has none. */
export function resolveUiThreadPseudoApi(): ReanimatedPseudoApi | undefined {
  if (pseudoApi === undefined) {
    pseudoApi = null;
    try {
      const reanimated = require("react-native-reanimated");
      if (
        typeof reanimated?.setPseudoStyles === "function" &&
        typeof reanimated?.createPseudoGroup === "function"
      ) {
        pseudoApi = reanimated;
      }
    } catch {
      // Reanimated is an optional peer; without it the press state stays in JavaScript.
    }
  }
  return pseudoApi ?? undefined;
}

/** A press condition the UI thread resolves: the element's own `:active`, or an ancestor group's (`group-active:`). */
export type UiThreadPressRule =
  | { kind: "own"; rule: StyleRule }
  | {
      kind: "group";
      rule: StyleRule;
      registration: ContainerContextValue[string];
      name: string;
    };

const withoutPseudoClasses = weakFamily(
  (rule: StyleRule): StyleRule => ({ ...rule, p: undefined }),
);

const withoutContainerQueries = weakFamily(
  (rule: StyleRule): StyleRule => ({ ...rule, cq: undefined }),
);

/**
 * The UI-thread form of a rule whose only press-dependent condition is
 * `:active`, or `undefined` for a rule that stays in JavaScript: one that also
 * needs hover or focus, registers a container, reaches its group through more
 * than one container, or names a group that is not an ancestor, which the
 * resting path answers by never matching.
 *
 * A rule that publishes variables stays too, because what descendants inherit
 * changes only through a render. Text is the exception for the variables this
 * runtime publishes itself: its nested runs inherit natively.
 */
export function classifyUiThreadPressRule(
  rule: StyleRule,
  inheritedContainers: ContainerContextValue,
  rendersText: boolean,
): UiThreadPressRule | undefined {
  if (rule.c || (rule.v && !(rendersText && publishesOnlyOwnText(rule.v)))) {
    return undefined;
  }

  if (rule.p) {
    return isActiveOnly(rule.p)
      ? { kind: "own", rule: withoutPseudoClasses(rule) }
      : undefined;
  }

  const query = rule.cq?.length === 1 ? rule.cq[0] : undefined;
  if (!query?.p || query.m || query.a || !isActiveOnly(query.p)) {
    return undefined;
  }

  const name = query.n ?? DEFAULT_CONTAINER_NAME;
  const registration = inheritedContainers[name];
  if (!registration) {
    return undefined;
  }

  return {
    kind: "group",
    rule: withoutContainerQueries(rule),
    registration,
    name,
  };
}

function isActiveOnly(query: NonNullable<StyleRule["p"]>) {
  return Boolean(query.a) && !query.h && !query.f;
}

function publishesOnlyOwnText(variables: NonNullable<StyleRule["v"]>) {
  return variables.every(([name]) => name.startsWith("__rn-css-"));
}

/********************************* Host views *********************************/

export interface PressSelectorStyle {
  selector: PressSelector;
  /** The container whose press this selector follows, for `group-active:`. */
  groupContainer?: WeakKey;
  style: Record<string, unknown>;
}

export interface PressRegistration {
  selectors: PressSelectorStyle[];
  defaultStyle: Record<string, unknown>;
  transition?: Record<string, unknown>;
  /** This element's own container key, when it may host a group. */
  hostsGroupContainer?: WeakKey;
}

export interface PressHost {
  /** The registration this element's latest render resolved. */
  registration: PressRegistration | undefined;
  /** Registers the latest registration on the attached view. */
  flush(): void;
  /** The ref to put on the element, composed with the consumer's own. */
  refFor(
    consumerRef: unknown,
  ): (instance: object | null) => (() => void) | void;
}

const groupTokens = new WeakMap<WeakKey, number>();
const hostsByContainer = new WeakMap<WeakKey, PressHost>();

/**
 * The group a container's followers name. It is created for the first follower,
 * and a container that is already mounted re-registers then, so a follower that
 * mounts after its group still finds it hosted.
 */
function resolveGroupToken(
  api: ReanimatedPseudoApi,
  container: WeakKey,
): number {
  let token = groupTokens.get(container);
  if (token === undefined) {
    token = api.createPseudoGroup();
    groupTokens.set(container, token);
    hostsByContainer.get(container)?.flush();
  }
  return token;
}

export function createPressHost(): PressHost {
  let instance: object | undefined;
  let flushed: ReanimatedPseudoConfig | undefined;
  const composedRefs = new WeakMap<
    object,
    (instance: object | null) => (() => void) | void
  >();

  const host: PressHost = {
    registration: undefined,
    flush() {
      const api = resolveUiThreadPseudoApi();
      if (!api || !instance) {
        return;
      }
      const config = toReanimatedConfig(api, host.registration);
      if (!config) {
        if (flushed) {
          api.setPseudoStyles(instance, { selectors: [] });
          flushed = undefined;
        }
        return;
      }
      if (flushed && isSameStyleValue(flushed, config)) {
        return;
      }
      api.setPseudoStyles(instance, config);
      flushed = config;
    },
    refFor(consumerRef) {
      if (typeof consumerRef !== "function" && !isRefObject(consumerRef)) {
        return attach;
      }
      let composed = composedRefs.get(consumerRef);
      if (!composed) {
        composed = (next) => {
          const releaseConsumer = assignRef(consumerRef, next);
          const releaseHost = attach(next);
          return () => {
            releaseHost?.();
            if (typeof releaseConsumer === "function") {
              releaseConsumer();
            } else {
              assignRef(consumerRef, null);
            }
          };
        };
        composedRefs.set(consumerRef, composed);
      }
      return composed;
    },
  };

  function attach(next: object | null) {
    if (next === null) {
      return;
    }
    instance = next;
    host.flush();
    return () => {
      if (flushed) {
        resolveUiThreadPseudoApi()?.setPseudoStyles(next, null);
        flushed = undefined;
      }
      if (instance === next) {
        instance = undefined;
      }
    };
  }

  return host;
}

/** Makes `host` the press host a container's late followers re-register through. */
export function publishContainerHost(container: WeakKey, host: PressHost) {
  hostsByContainer.set(container, host);
}

function toReanimatedConfig(
  api: ReanimatedPseudoApi,
  registration: PressRegistration | undefined,
): ReanimatedPseudoConfig | undefined {
  if (!registration) {
    return undefined;
  }

  const hostsGroup =
    registration.hostsGroupContainer === undefined
      ? undefined
      : groupTokens.get(registration.hostsGroupContainer);

  if (!registration.selectors.length && hostsGroup === undefined) {
    return undefined;
  }

  const selectors = registration.selectors.map(
    ({ selector, groupContainer, style }): ReanimatedPseudoSelector =>
      groupContainer === undefined
        ? { selector, style }
        : { selector, style, group: resolveGroupToken(api, groupContainer) },
  );

  return {
    defaultStyle: registration.defaultStyle,
    selectors,
    ...(hostsGroup !== undefined && { hostsGroup }),
    ...(registration.transition && { transition: registration.transition }),
  };
}

function isRefObject(value: unknown): value is { current: unknown } {
  return typeof value === "object" && value !== null && "current" in value;
}

function assignRef(ref: unknown, value: object | null): unknown {
  if (typeof ref === "function") {
    return ref(value);
  }
  if (isRefObject(ref)) {
    ref.current = value;
  }
  return undefined;
}

/******************************* Style resolution ******************************/

const TRANSITION_PROPERTIES: readonly string[] = [
  "transitionProperty",
  "transitionDuration",
  "transitionTimingFunction",
  "transitionDelay",
  "transitionBehavior",
];

/** One style object from a style prop that may nest arrays, flattened the way React Native does. */
export function flattenStyle(style: unknown): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  mergeStyleInto(flat, style);
  return flat;
}

function mergeStyleInto(target: Record<string, unknown>, style: unknown) {
  if (Array.isArray(style)) {
    for (const item of style) {
      mergeStyleInto(target, item);
    }
  } else if (style && typeof style === "object") {
    Object.assign(target, style);
  }
}

/** The properties a pressed style changes from the resting one, or `undefined` when it changes none. */
export function diffPressedStyle(
  resting: Record<string, unknown>,
  pressed: Record<string, unknown>,
): Record<string, unknown> | undefined {
  let changed: Record<string, unknown> | undefined;
  for (const property of Object.keys(pressed)) {
    if (
      TRANSITION_PROPERTIES.includes(property) ||
      isSameStyleValue(resting[property], pressed[property])
    ) {
      continue;
    }
    changed ??= {};
    changed[property] = pressed[property];
  }
  return changed;
}

/** The resting style's transition, which a press follows the way a class change would. */
export function pickTransition(
  resting: Record<string, unknown>,
): Record<string, unknown> | undefined {
  let transition: Record<string, unknown> | undefined;
  for (const property of TRANSITION_PROPERTIES) {
    if (resting[property] !== undefined) {
      transition ??= {};
      transition[property] = resting[property];
    }
  }
  return transition;
}

function isSameStyleValue(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (
    typeof left !== "object" ||
    typeof right !== "object" ||
    left === null ||
    right === null
  ) {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Whether the element refuses presses, so it must not paint one. */
export function isPressDisabled(props: Record<string, any> | undefined | null) {
  return (
    props?.disabled === true ||
    props?.["aria-disabled"] === true ||
    props?.accessibilityState?.disabled === true
  );
}

/******************************** Registration ********************************/

/** Whether a config styles the element's own view, the one a press is painted on. */
export function targetsElementStyle(config: Config) {
  return (
    config.target === "style" ||
    (Array.isArray(config.target) &&
      config.target.length === 1 &&
      config.target[0] === "style")
  );
}

/** What the element registers for its presses: each pressed style as its change from the resting one. */
export function resolvePressRegistration(
  state: ComponentState,
  props: Record<string, any> | undefined | null,
  styledProps: Record<string, any> | undefined,
): PressRegistration | undefined {
  const config = state.configs.find(targetsElementStyle);
  if (!config) {
    return undefined;
  }

  const resting = flattenStyle(styledProps?.style);
  const disabled = isPressDisabled(props);
  const selectors: PressSelectorStyle[] = [];

  if (state.pressStylesObs && !disabled) {
    const changed = diffPressedStyle(
      resting,
      flattenStyle(getStyledTarget(state, state.pressStylesObs, props, config)),
    );
    if (changed) {
      selectors.push({ selector: ":active-deepest", style: changed });
    }
  }

  for (const group of state.groupPressStylesObs ?? []) {
    const changed = diffPressedStyle(
      resting,
      flattenStyle(getStyledTarget(state, group.stylesObs, props, config)),
    );
    if (changed) {
      selectors.push({
        selector: ":active",
        groupContainer: group.container,
        style: changed,
      });
    }
  }

  const defaultStyle: Record<string, unknown> = {};
  for (const { style } of selectors) {
    for (const property of Object.keys(style)) {
      defaultStyle[property] = resting[property];
    }
  }

  return {
    selectors,
    defaultStyle,
    transition: pickTransition(resting),
    hostsGroupContainer:
      state.containers && !disabled ? state.ruleEffectGetter : undefined,
  };
}
