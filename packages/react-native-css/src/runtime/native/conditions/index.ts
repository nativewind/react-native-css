import type {
  AttributeQuery,
  InlineStyle,
  Props,
  PseudoClassesQuery,
  StyleRule,
} from "../../runtime.types";
import { Declarations } from "../declarations";
import { activeFamily, focusFamily, hoverFamily } from "../globals";
import { ImmutableGuards } from "../native.types";
import { testMediaQueries } from "./media-query";

export function testRule(
  styleRule: StyleRule,
  weakKey: WeakKey,
  next: Declarations,
  props: Props,
  guards: ImmutableGuards,
) {
  if (styleRule.p && !testPseudoClasses(styleRule.p, weakKey, next)) {
    return false;
  }
  if (styleRule?.m && !testMediaQueries(styleRule.m, weakKey, next)) {
    return false;
  }
  if (styleRule.aq && !testAttributes(styleRule.aq, props, guards)) {
    return false;
  }
  return true;
}

function testPseudoClasses(
  query: PseudoClassesQuery,
  weakKey: WeakKey,
  effect: Declarations,
) {
  if (query.h && !effect.get(hoverFamily(weakKey))) {
    return false;
  }
  if (query.a && !effect.get(activeFamily(weakKey))) {
    return false;
  }
  if (query.f && !effect.get(focusFamily(weakKey))) {
    return false;
  }
  return true;
}

export function testAttributes(
  queries: AttributeQuery[],
  props: Props,
  guards: ImmutableGuards,
) {
  return queries.every((query) => testAttribute(query, props, guards));
}

export function testAttribute(
  query: AttributeQuery,
  props: Props,
  guards: ImmutableGuards,
) {
  let value: any;

  if (query[0] === "a") {
    value = props?.[query[1]];
  } else {
    value = props?.dataSet?.[query[1]];
  }

  guards.push([query[0], query[1], value]);

  const operator = query[2];

  value = value?.toString();

  if (!operator) {
    return value !== undefined && value !== null;
  }

  switch (operator) {
    case "!":
      return !value;
    case "=":
      return value === query[3];
    case "~=":
      return value?.split(" ").includes(query[3]);
    case "|=":
      return value?.startsWith(query[3] + "-");
    case "^=":
      return value?.startsWith(query[3]);
    case "$=":
      return value?.endsWith(query[3]);
    case "*=":
      return value?.includes(query[3]);
    default:
      operator satisfies never;
      return false;
  }
}
