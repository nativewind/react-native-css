import type { StyleDescriptor } from "react-native-css/compiler";
import {
  isStyleDescriptorArray,
  isStyleFunction,
  timingFunctionValue,
  transitionStyleKey,
} from "react-native-css/utilities";

import { ShortHandSymbol } from "../constants";
import type { SimpleResolveValue, StyleFunctionResolver } from "../resolve";
import {
  easingListResolver,
  isEasingKeyword,
  isGroupList,
  keywordListResolver,
  readEasing,
  readItems,
  readListItems,
  readTime,
  timeListResolver,
} from "./_lists";

/** The CSS-wide keywords and `default`, which a `<custom-ident>` excludes (css-values-4 §4.2). */
const RESERVED_IDENTS: ReadonlySet<string> = new Set([
  "initial",
  "inherit",
  "unset",
  "revert",
  "revert-layer",
  "default",
]);

/** `transition-behavior`'s keywords (CSS Transitions 2 §2.5), which `<single-transition>` takes beside the others. */
const BEHAVIOR_KEYWORDS: ReadonlySet<string> = new Set([
  "normal",
  "allow-discrete",
]);

/** One `<single-transition>` (CSS Transitions 2 §2.6), whose components come in any order. */
interface SingleTransition {
  readonly property: string;
  readonly duration: number;
  readonly delay: number;
  readonly timingFunction: unknown;
  readonly behavior: string | undefined;
}

function isBehaviorKeyword(token: unknown): token is string {
  return (
    typeof token === "string" && BEHAVIOR_KEYWORDS.has(token.toLowerCase())
  );
}

/** An ident sequence (css-syntax-3), the shape a property name a script sets must have. */
const IDENTIFIER = /^(?:--|-?[a-z_\u0080-\uffff])[\w\u0080-\uffff-]*$/i;

function isIdentifier(token: unknown): token is string {
  return typeof token === "string" && IDENTIFIER.test(token);
}

function isPropertyName(token: unknown): token is string {
  return (
    isIdentifier(token) && !isEasingKeyword(token) && !isBehaviorKeyword(token)
  );
}

function isTimingFunction(token: unknown): boolean {
  return readEasing(token) !== undefined;
}

/** The first time a duration can be, one not negative, is the duration and the other the delay (CSS Transitions 1 §2.5). */
function readTimes(
  times: readonly number[],
): readonly [duration: number, delay: number] | undefined {
  let duration: number | undefined;
  let delay: number | undefined;

  for (const time of times) {
    if (duration === undefined && time >= 0) {
      duration = time;
    } else if (delay === undefined) {
      delay = time;
    } else {
      return undefined;
    }
  }

  return [duration ?? 0, delay ?? 0];
}

/** One comma group's tokens as a transition, or nothing when a component repeats or a token is none of them. */
function readSingleTransition(
  tokens: readonly unknown[],
): SingleTransition | undefined {
  const properties = tokens.filter(isPropertyName);
  const times = tokens
    .map(readTime)
    .filter((time): time is number => time !== undefined);
  const timingFunctions = tokens.filter(isTimingFunction);
  const behaviors = tokens.filter(isBehaviorKeyword);
  const durationAndDelay = readTimes(times);

  if (
    durationAndDelay === undefined ||
    properties.length > 1 ||
    timingFunctions.length > 1 ||
    behaviors.length > 1 ||
    properties.length +
      times.length +
      timingFunctions.length +
      behaviors.length !==
      tokens.length
  ) {
    return undefined;
  }

  const [duration, delay] = durationAndDelay;

  return {
    property: properties[0] ?? "all",
    duration,
    delay,
    timingFunction: readEasing(timingFunctions[0] ?? "ease"),
    behavior: behaviors[0]?.toLowerCase(),
  };
}

function isVariable(descriptor: StyleDescriptor): boolean {
  return isStyleFunction(descriptor) && descriptor[1] === "var";
}

/**
 * A transition list a variable holds, as its comma groups: a list holding a list is a
 * list of groups, at any depth, and one holding none is one run of tokens that a
 * property name after the first splits.
 */
function readHeldGroups(value: unknown): readonly (readonly unknown[])[] {
  if (!Array.isArray(value)) {
    return [[value]];
  }

  return value.some((item) => Array.isArray(item))
    ? value.flatMap((item) => readHeldGroups(item))
    : splitAtPropertyNames(value);
}

/**
 * `transition`'s arguments as their comma groups: a variable that holds the whole
 * list or a whole group is read by its own list, and one read inside a group
 * splices its tokens into that group.
 */
function readTransitionGroups(
  descriptor: StyleDescriptor,
  resolveValue: SimpleResolveValue,
): readonly (readonly unknown[])[] {
  if (isVariable(descriptor)) {
    return readHeldGroups(resolveValue(descriptor));
  }

  return isGroupList(descriptor)
    ? descriptor.flatMap((group) =>
        isStyleDescriptorArray(group)
          ? readWrittenGroup(group, resolveValue)
          : readTransitionGroups(group, resolveValue),
      )
    : splitAtPropertyNames(readItems(resolveValue(descriptor)));
}

/**
 * A comma group the declaration writes, each variable's tokens spliced in: a second
 * property name written in the group makes it invalid, and one a variable brings
 * starts the next group, as a variable's list keeps no commas.
 */
function readWrittenGroup(
  group: readonly StyleDescriptor[],
  resolveValue: SimpleResolveValue,
): readonly (readonly unknown[])[] {
  const tokens = group.flatMap((token) =>
    readItems(resolveValue(token)).map((value) => ({
      value,
      held: isVariable(token),
    })),
  );

  return splitAtPropertyNames(
    tokens.map((token) => token.value),
    (index) => tokens[index]?.held === true,
  );
}

function splitAtPropertyNames(
  tokens: readonly unknown[],
  mayStartGroup: (index: number) => boolean = () => true,
): readonly (readonly unknown[])[] {
  const groups: unknown[][] = [];
  let group: unknown[] = [];

  tokens.forEach((token, index) => {
    if (
      isPropertyName(token) &&
      mayStartGroup(index) &&
      group.some(isPropertyName)
    ) {
      groups.push(group);
      group = [];
    }
    group.push(token);
  });

  groups.push(group);
  return groups;
}

function isSingleTransition(
  transition: SingleTransition | undefined,
): transition is SingleTransition {
  return transition !== undefined;
}

/** A `transition-property` list: `none` alone, or property names (CSS Transitions 1 §2.1). */
function isTransitionPropertyList(
  names: readonly unknown[],
): names is readonly string[] {
  const keywords = names.map((name) =>
    isIdentifier(name) ? name.toLowerCase() : undefined,
  );

  return (
    !keywords.includes(undefined) &&
    !keywords.some((keyword) => keyword && RESERVED_IDENTS.has(keyword)) &&
    (keywords.length === 1 || !keywords.includes("none"))
  );
}

/** `transition` held in a variable, expanded into the longhands the compiler builds for a written one. */
export const transition: StyleFunctionResolver = (
  resolveValue,
  styleFunction,
) => {
  const parsed = readTransitionGroups(styleFunction[2], resolveValue).map(
    readSingleTransition,
  );
  const transitions = parsed.filter(isSingleTransition);
  const properties = transitions.map((single) => single.property);

  if (
    transitions.length === 0 ||
    transitions.length !== parsed.length ||
    !isTransitionPropertyList(properties)
  ) {
    return;
  }

  const timingFunctions = transitions.map((single) => single.timingFunction);
  const behaviors = transitions.some((single) => single.behavior)
    ? {
        transitionBehavior: transitions.map(
          (single) => single.behavior ?? "normal",
        ),
      }
    : {};

  return {
    [ShortHandSymbol]: true,
    ...behaviors,
    transitionProperty: properties.map((property) =>
      transitionStyleKey(property),
    ),
    transitionDuration: transitions.map((single) => single.duration),
    transitionDelay: transitions.map((single) => single.delay),
    transitionTimingFunction: timingFunctionValue(timingFunctions),
  };
};

/** `transition-property` held in a variable, naming the style keys a written one names. */
export const transitionProperty: StyleFunctionResolver = (
  resolveValue,
  styleFunction,
) => {
  const names = readListItems(styleFunction[2], resolveValue);

  if (names === undefined || !isTransitionPropertyList(names)) {
    return;
  }

  return names.map((name) => transitionStyleKey(name));
};

export const transitionDuration = timeListResolver(false);

export const transitionDelay = timeListResolver(true);

export const transitionTimingFunction = easingListResolver;

export const transitionBehavior = keywordListResolver(BEHAVIOR_KEYWORDS);
