import { transitionStyleKey } from "react-native-css/utilities";

import { ShortHandSymbol } from "../constants";
import type { StyleFunctionResolver } from "../resolve";

const EASING_KEYWORDS: ReadonlySet<string> = new Set([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
]);

/** One `<single-transition>` (CSS Transitions 1 §2.5), whose components come in any order. */
interface SingleTransition {
  readonly property: string;
  readonly duration: number;
  readonly delay: number;
  readonly timingFunction: unknown;
}

function isPropertyName(token: unknown): token is string {
  return typeof token === "string" && !EASING_KEYWORDS.has(token);
}

function isTimingFunction(token: unknown): boolean {
  return (
    (typeof token === "string" && EASING_KEYWORDS.has(token)) ||
    (typeof token === "object" && token !== null && !Array.isArray(token))
  );
}

/** The first time is the duration and the second the delay; anything else makes the transition invalid. */
function readSingleTransition(
  tokens: readonly unknown[],
): SingleTransition | undefined {
  const properties = tokens.filter(isPropertyName);
  const times = tokens.filter((token) => typeof token === "number");
  const timingFunctions = tokens.filter(isTimingFunction);

  if (
    properties.length > 1 ||
    times.length > 2 ||
    timingFunctions.length > 1 ||
    properties.length + times.length + timingFunctions.length !== tokens.length
  ) {
    return undefined;
  }

  return {
    property: properties[0] ?? "all",
    duration: times[0] ?? 0,
    delay: times[1] ?? 0,
    timingFunction: timingFunctions[0] ?? "ease",
  };
}

/**
 * A variable's transition list as its comma groups. A group of one token arrives
 * bare rather than as a list of one, so a list holding no list is one group
 * unless a second property name opens the next.
 */
function readTransitionGroups(value: unknown): readonly (readonly unknown[])[] {
  if (!Array.isArray(value)) {
    return [[value]];
  }

  if (value.some((token) => Array.isArray(token))) {
    return value.map((group): readonly unknown[] =>
      Array.isArray(group) ? group : [group],
    );
  }

  const groups: unknown[][] = [];
  let group: unknown[] = [];

  for (const token of value) {
    if (isPropertyName(token) && group.some(isPropertyName)) {
      groups.push(group);
      group = [];
    }
    group.push(token);
  }

  groups.push(group);
  return groups;
}

function isSingleTransition(
  transition: SingleTransition | undefined,
): transition is SingleTransition {
  return transition !== undefined;
}

/** `transition` held in a variable, expanded into the longhands the compiler builds for a written one. */
export const transition: StyleFunctionResolver = (resolveValue, func) => {
  const parsed = readTransitionGroups(resolveValue(func[2])).map(
    readSingleTransition,
  );
  const transitions = parsed.filter(isSingleTransition);

  if (transitions.length === 0 || transitions.length !== parsed.length) {
    return;
  }

  const timingFunctions = transitions.map((single) => single.timingFunction);

  return {
    [ShortHandSymbol]: true,
    transitionProperty: transitions.flatMap(
      (single) => transitionStyleKey(single.property) ?? [],
    ),
    transitionDuration: transitions.map((single) => single.duration),
    transitionDelay: transitions.map((single) => single.delay),
    transitionTimingFunction:
      timingFunctions.length === 1 ? timingFunctions[0] : timingFunctions,
  };
};

/** `transition-property` held in a variable, naming the style keys a written one names. */
export const transitionProperty: StyleFunctionResolver = (
  resolveValue,
  func,
) => {
  const value = resolveValue(func[2]);
  const names = (Array.isArray(value) ? value.flat() : [value]).filter(
    (name): name is string => typeof name === "string",
  );

  return names.flatMap((name) => transitionStyleKey(name) ?? []);
};
