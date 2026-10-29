import {
  easingListResolver,
  keywordListResolver,
  timeListResolver,
} from "./_lists";

export const animationDuration = timeListResolver(false);

export const animationDelay = timeListResolver(true);

export const animationTimingFunction = easingListResolver;

export const ANIMATION_DIRECTIONS = [
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
] as const;

export const ANIMATION_FILL_MODES = [
  "none",
  "forwards",
  "backwards",
  "both",
] as const;

export const ANIMATION_PLAY_STATES = ["running", "paused"] as const;

export const animationDirection = keywordListResolver(
  new Set(ANIMATION_DIRECTIONS),
);

export const animationFillMode = keywordListResolver(
  new Set(ANIMATION_FILL_MODES),
);

export const animationPlayState = keywordListResolver(
  new Set(ANIMATION_PLAY_STATES),
);

export const animationIterationCount = keywordListResolver(
  new Set(["infinite"]),
  (item) => (typeof item === "number" && item >= 0 ? item : undefined),
);
