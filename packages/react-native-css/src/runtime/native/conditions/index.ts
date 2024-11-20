import type { PseudoClassesQuery, StyleRule } from "../../runtime.types";
import { activeFamily, focusFamily, hoverFamily } from "../globals";
import type { Effect } from "../utils/observable";
import { testMediaQueries } from "./media-query";

export function testRule(
  styleRule: StyleRule,
  weakKey: WeakKey,
  effect: Effect,
) {
  if (styleRule.p && !testPseudoClasses(styleRule.p, weakKey, effect)) {
    return false;
  }
  if (styleRule.m && !testMediaQueries(styleRule.m, weakKey, effect)) {
    return false;
  }
  return true;
}

function testPseudoClasses(
  query: PseudoClassesQuery,
  weakKey: WeakKey,
  effect: Effect,
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
