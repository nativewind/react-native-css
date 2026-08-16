/* eslint-disable */
import type { MediaFeatureNameFor_ContainerSizeFeatureId } from "lightningcss";
import type {
  ContainerQuery,
  MediaCondition,
  PseudoClassesQuery,
  StyleDescriptor,
} from "react-native-css/compiler";

import {
  activeFamily,
  containerHeightFamily,
  containerWidthFamily,
  focusFamily,
  hoverFamily,
  type ContainerContextValue,
  type Getter,
} from "../reactivity";
// import { testAttributes } from "./attributes";
import type { RenderGuard } from "./guards";
import {
  conjoin,
  disjoin,
  matches,
  negate,
  UNKNOWN,
  type Truth,
} from "./kleene";
import { isTruthyFeatureValue } from "./media-query";

export const DEFAULT_CONTAINER_NAME = "c:___default___";

export function testContainerQueries(
  queries: ContainerQuery[],
  inheritedContainers: ContainerContextValue,
  guards: RenderGuard[],
  get: Getter,
) {
  return queries.every((query) => {
    return testContainerQuery(query, inheritedContainers, guards, get);
  });
}

export function testContainerQuery(
  query: ContainerQuery,
  inheritedContainers: ContainerContextValue,
  guards: RenderGuard[],
  get: Getter,
): boolean {
  const name = query.n ?? DEFAULT_CONTAINER_NAME;
  const container = inheritedContainers[name]!;

  guards.push(["c", name, container]);

  if (!container) {
    return false;
  }

  // if (query.a && !testAttributes(query.a, container.props, guards)) {
  //   return false;
  // }

  // A conditional group rule is a two-valued context, so a condition that is
  // still unknown here does not match - MQ5 § 3.1.
  if (
    query.m &&
    !matches(testContainerMediaCondition(query.m, container, get))
  ) {
    return false;
  }

  if (query.p && !testContainerPseudoCondition(query.p, container, get)) {
    return false;
  }

  return true;
}

function testContainerPseudoCondition(
  query: PseudoClassesQuery,
  containerKey: WeakKey,
  get: Getter,
): boolean {
  if (query.h && !get(hoverFamily(containerKey))) {
    return false;
  }
  if (query.a && !get(activeFamily(containerKey))) {
    return false;
  }
  if (query.f && !get(focusFamily(containerKey))) {
    return false;
  }
  return true;
}

function testContainerMediaCondition(
  condition: MediaCondition,
  containerKey: WeakKey,
  get: Getter,
): Truth {
  switch (condition[0]) {
    case "?":
      return UNKNOWN;
    case "!":
      return negate(
        testContainerMediaCondition(condition[1], containerKey, get),
      );
    case "&":
      return conjoin(condition[1], (query) =>
        testContainerMediaCondition(query, containerKey, get),
      );
    case "|":
      return disjoin(condition[1], (query) =>
        testContainerMediaCondition(query, containerKey, get),
      );
    case "!!": {
      const featureValue = getContainerFeatureValue(
        condition[1],
        containerKey,
        get,
      );
      return featureValue === undefined
        ? UNKNOWN
        : isTruthyFeatureValue(featureValue);
    }
    case "[]":
      // An interval this runtime does not evaluate has no answer, rather than
      // the answer `false`.
      return UNKNOWN;
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=": {
      const left = getContainerFeatureValue(condition[1], containerKey, get);
      const right = condition[2];

      // An operand the compiler could not resolve, or a feature this runtime
      // cannot measure, leaves the comparison with no answer at all.
      if (right === null || left === undefined) {
        return UNKNOWN;
      }

      if (condition[0] === "=") {
        return left === right;
      }

      // An operand that is a length the compiler could not fold reaches here as
      // a descriptor rather than a number: `(width > 10em)` compiles to
      // `[{}, "em", 10, 1]`, because `em` is relative to the element's own font
      // size. `px` folds to a number and `rem` folds against `inlineRem`, so
      // this arm carries ordinary CSS rather than a malformed prelude.
      // Ordering an operand the runtime cannot resolve gives `NaN`, which is
      // false for every operator - and false is the one answer a negation turns
      // into a match.
      if (typeof left !== "number" || typeof right !== "number") {
        return UNKNOWN;
      }

      switch (condition[0]) {
        case ">":
          return left > right;
        case ">=":
          return left >= right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        default:
          condition[0] satisfies never;
          return UNKNOWN;
      }
    }
    default:
      condition satisfies never;
      return UNKNOWN;
  }
}

function getContainerFeatureValue(
  name: MediaFeatureNameFor_ContainerSizeFeatureId,
  containerKey: WeakKey,
  get: Getter,
): StyleDescriptor {
  switch (name) {
    case "width":
      return get(containerWidthFamily(containerKey));
    case "height":
      return get(containerHeightFamily(containerKey));
    case "aspect-ratio": {
      const width = get(containerWidthFamily(containerKey));
      const height = get(containerHeightFamily(containerKey));
      return width / height;
    }
    case "orientation":
      const width = get(containerWidthFamily(containerKey));
      const height = get(containerHeightFamily(containerKey));
      return width > height ? "landscape" : "portrait";
    case "inline-size":
    case "block-size":
    default:
      return;
  }
}
