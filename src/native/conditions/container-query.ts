import type {
  ContainerQuery,
  MediaCondition,
  MediaFeatureComparison,
  PseudoClassesQuery,
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
import { testAttributes } from "./attributes";
import {
  compareMediaFeature,
  isTruthyFeatureValue,
  testMediaFeatureInterval,
  type MeasuredFeatureValue,
} from "./compare";
import type { RenderGuard } from "./guards";
import {
  conjoin,
  disjoin,
  matches,
  negate,
  UNKNOWN,
  type Truth,
} from "./kleene";

type ContainerFeatureName = Extract<
  MediaCondition,
  [MediaFeatureComparison, ...unknown[]]
>[1];

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
  const container = inheritedContainers[name];

  guards.push(["c", name, container]);

  if (!container) {
    return false;
  }

  // Ancestor snapshots have their own context guard. Their attributes must not
  // be compared with this descendant's props by the ordinary attribute guards.
  if (query.a && !testAttributes(query.a, container.props, [])) {
    return false;
  }

  if (
    query.m &&
    !matches(testContainerMediaCondition(query.m, container.key, get))
  ) {
    return false;
  }

  if (query.p && !testContainerPseudoCondition(query.p, container.key, get)) {
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
    case "!!":
      return isTruthyFeatureValue(
        getContainerFeatureValue(condition[1], containerKey, get),
      );
    case "[]":
      return testMediaFeatureInterval(
        condition,
        getContainerFeatureValue(condition[1], containerKey, get),
      );
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=":
      return compareMediaFeature(
        condition[0],
        getContainerFeatureValue(condition[1], containerKey, get),
        condition[2],
      );
    default:
      condition satisfies never;
      return UNKNOWN;
  }
}

function getContainerFeatureValue(
  name: ContainerFeatureName,
  containerKey: WeakKey,
  get: Getter,
): MeasuredFeatureValue {
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
    case "orientation": {
      const width = get(containerWidthFamily(containerKey));
      const height = get(containerHeightFamily(containerKey));
      return width > height ? "landscape" : "portrait";
    }
    case "inline-size":
    case "block-size":
    default:
      return undefined;
  }
}
