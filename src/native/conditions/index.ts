import type { PseudoClassesQuery, StyleRule } from "react-native-css/compiler";

import type { Props } from "../../runtime.types";
import {
  activeFamily,
  focusFamily,
  hoverFamily,
  type ContainerContextValue,
  type Getter,
} from "../reactivity";
import { testAttributes } from "./attributes";
import { testContainerQueries } from "./container-query";
import type { RenderGuard } from "./guards";
import { testMediaQuery } from "./media-query";

export function testRule(
  rule: StyleRule,
  get: Getter,
  props: Props,
  guards: RenderGuard[],
  containerContext: ContainerContextValue,
) {
  if (rule.p && !pseudoClasses(rule.p, get)) {
    return false;
  }
  if (rule.m && !testMediaQuery(rule.m, get)) {
    return false;
  }
  if (rule.aq && !testAttributes(rule.aq, props, guards)) {
    return false;
  }
  if (
    rule.cq &&
    !testContainerQueries(rule.cq, containerContext, guards, get)
  ) {
    return false;
  }

  return true;
}

function pseudoClasses(query: PseudoClassesQuery, get: Getter) {
  // IMPORTANT: active needs: to be first. Modifies a global value
  // that we use to determine if the component should be a pressable
  if (query.a && !get(activeFamily(get))) {
    return false;
  }
  if (query.h && !get(hoverFamily(get))) {
    return false;
  }
  if (query.f && !get(focusFamily(get))) {
    return false;
  }
  return true;
}
