import type { StyleDescriptor } from "react-native-css/compiler";
import {
  isStyleDescriptorArray,
  round,
  timingFunctionValue,
} from "react-native-css/utilities";

import type { SimpleResolveValue, StyleFunctionResolver } from "../resolve";

const EASING_KEYWORDS: ReadonlySet<string> = new Set([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
]);

export function isEasingKeyword(token: string): boolean {
  return EASING_KEYWORDS.has(token.toLowerCase());
}

/** An easing keyword in the case React Native reads, or a `cubic-bezier()` or `steps()` already resolved to Reanimated's easing object, which Reanimated knows by its `normalize`. */
export function readEasing(token: unknown): unknown {
  if (typeof token === "string") {
    return isEasingKeyword(token) ? token.toLowerCase() : undefined;
  }

  return typeof token === "object" &&
    token !== null &&
    typeof (token as { readonly normalize?: unknown }).normalize === "function"
    ? token
    : undefined;
}

/**
 * A comma list a variable holds, item by item: one item arrives bare, and a list
 * that also holds a list variable, `var(--a), 2s`, arrives with that list nested.
 */
export function readItems(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value.flat(Infinity) : [value];
}

/**
 * Whether a declaration's arguments keep their comma groups: the compiler writes a
 * group of several tokens as a list and a group of one bare, so a list holding a
 * list is a list of groups.
 */
export function isGroupList(
  descriptor: StyleDescriptor,
): descriptor is StyleDescriptor[] {
  return (
    isStyleDescriptorArray(descriptor) &&
    descriptor.some((group) => isStyleDescriptorArray(group))
  );
}

/** A `#` list longhand's items, or nothing when one of its comma groups holds several tokens. */
export function readListItems(
  descriptor: StyleDescriptor,
  resolveValue: SimpleResolveValue,
): readonly unknown[] | undefined {
  return isGroupList(descriptor)
    ? undefined
    : readItems(resolveValue(descriptor));
}

/** Every item read as the list's grammar reads it, or nothing when one is not an item, which makes the declaration invalid. */
function readList(
  descriptor: StyleDescriptor,
  resolveValue: SimpleResolveValue,
  readItem: (item: unknown) => unknown,
): readonly unknown[] | undefined {
  const items = readListItems(descriptor, resolveValue)?.map(readItem);
  return items === undefined || items.includes(undefined) ? undefined : items;
}

/** A time a script sets on a variable, `"300ms"` or `"0.3s"`, in milliseconds at the compiler's precision. */
function readTimeText(text: string): number | undefined {
  const time = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(ms|s)$/i.exec(
    text.trim(),
  );
  const [, amount, unit] = time ?? [];
  return amount === undefined
    ? undefined
    : round(Number(amount) * (unit?.toLowerCase() === "s" ? 1000 : 1));
}

/** A time in milliseconds, as the compiler writes one or a script sets one. */
export function readTime(token: unknown): number | undefined {
  return typeof token === "string"
    ? readTimeText(token)
    : typeof token === "number"
      ? token
      : undefined;
}

/** A `<time>#` longhand held in a variable, as the list of milliseconds the compiler builds for a written one. */
export function timeListResolver(
  allowsNegative: boolean,
): StyleFunctionResolver {
  return (resolveValue, styleFunction) =>
    readList(styleFunction[2], resolveValue, (item) => {
      const time = readTime(item);
      return time !== undefined && (allowsNegative || time >= 0)
        ? time
        : undefined;
    });
}

/** An `<easing-function>#` longhand held in a variable: one easing alone, or the list, as the compiler builds them for a written one. */
export const easingListResolver: StyleFunctionResolver = (
  resolveValue,
  styleFunction,
) => {
  const easings = readList(styleFunction[2], resolveValue, readEasing);
  return easings && timingFunctionValue(easings);
};

/** A keyword list longhand held in a variable, its keywords in the case React Native reads. */
export function keywordListResolver(
  keywords: ReadonlySet<string>,
  readOther: (item: unknown) => unknown = () => undefined,
): StyleFunctionResolver {
  return (resolveValue, styleFunction) =>
    readList(styleFunction[2], resolveValue, (item) => {
      if (typeof item !== "string") {
        return readOther(item);
      }

      const keyword = item.toLowerCase();
      return keywords.has(keyword) ? keyword : undefined;
    });
}
