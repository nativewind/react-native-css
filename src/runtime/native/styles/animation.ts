/* eslint-disable */
import type { ComponentType } from "react";

import { StyleCollection } from "../injection";
import { weakFamily } from "../reactivity";
import type { StyleFunctionResolver } from "./resolve";
import { shorthandHandler } from "./shorthand";

const name = ["animationName", "string", "none"] as const;
const delay = ["animationDelay", "number", 0] as const;
const duration = ["animationDuration", "number", 0] as const;
const iteration = [
  "animationIterationCount",
  ["number", "infinite"],
  1,
] as const;
const fill = [
  "animationFillMode",
  ["none", "forwards", "backwards", "both"],
  "none",
] as const;
const playState = [
  "animationPlayState",
  ["running", "paused"],
  "running",
] as const;
const direction = [
  "animationDirection",
  ["normal", "reverse", "alternate", "alternate-reverse"],
  "normal",
] as const;
const timingFunction = [
  "animationTimingFunction",
  ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "object"],
  "ease",
] as const;

export const animationShorthand = shorthandHandler(
  [
    [name],
    [duration, name],
    [name, duration],
    [name, duration, iteration],
    [name, duration, timingFunction, iteration],
    [duration, delay, name],
    [duration, delay, iteration, name],
    [duration, delay, iteration, timingFunction, name],
    [name, duration, timingFunction, delay, iteration, fill],
  ],
  [
    name,
    delay,
    direction,
    duration,
    fill,
    iteration,
    playState,
    timingFunction,
  ],
);

export const animatedComponentFamily = weakFamily(
  (component: ComponentType) => {
    if (
      "displayName" in component &&
      component.displayName?.startsWith("Animated.")
    ) {
      return component;
    }

    const createAnimatedComponent =
      require("react-native-reanimated").createAnimatedComponent;

    return createAnimatedComponent(component);
  },
);

export const animation: StyleFunctionResolver = (
  resolveValue,
  value,
  get,
  options,
) => {
  const animationShortHandTuples: [unknown, string][] | undefined =
    animationShorthand(resolveValue, value, get, options);

  if (!animationShortHandTuples) {
    return;
  }

  const nameTuple = animationShortHandTuples.find(
    (tuple) => tuple[1] === "animationName",
  );

  const name = nameTuple?.[0];

  if (!nameTuple || typeof name !== "string") {
    return;
  }

  const keyframes = get(StyleCollection.keyframes(name));

  const animation: Record<string, any> = {};
  for (const [progress, declarations] of keyframes) {
    animation[progress] ??= {};

    const props = options.calculateProps?.(
      get,
      // Cast this into a StyleRule[]
      [{ s: [0], d: declarations }],
      options.renderGuards,
      options.inheritedVariables,
      options.inlineVariables,
    );

    if (!props) {
      continue;
    }

    if (props.normal) {
      Object.assign(animation[progress], props.normal);
    }
    if (props.important) {
      Object.assign(animation[progress], props.important);
    }

    animation[progress] = animation[progress].style;
  }

  nameTuple[0] = animation;

  return animationShortHandTuples;
};

const advancedTimingFunctions: Record<
  string,
  () => (...args: any[]) => unknown
> = {
  "cubic-bezier": () => {
    return (
      require("react-native-reanimated") as typeof import("react-native-reanimated")
    ).cubicBezier;
  },
  "steps": () => {
    return (
      require("react-native-reanimated") as typeof import("react-native-reanimated")
    ).steps;
  },
};

export const timingFunctionResolver: StyleFunctionResolver = (
  resolveValue,
  value,
) => {
  const name = value[1];
  const resolver = advancedTimingFunctions[name];

  if (!resolver) {
    return;
  }

  const args: unknown[] = resolveValue(value[2]);

  const fn = resolver();

  const result = fn(...args);

  return result;
};
