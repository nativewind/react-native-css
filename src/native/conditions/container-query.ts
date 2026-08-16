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
import { compareMediaFeature, testMediaFeatureInterval } from "./compare";
import type { RenderGuard } from "./guards";

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

  if (query.m && !testContainerMediaCondition(query.m, container, get)) {
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
): boolean {
  switch (condition[0]) {
    case "!":
      return !testContainerMediaCondition(condition[1], containerKey, get);
    case "&":
      return condition[1].every((query) => {
        return testContainerMediaCondition(query, containerKey, get);
      });
    case "|":
      return condition[1].some((query) => {
        return testContainerMediaCondition(query, containerKey, get);
      });
    // `@container (width)` asks whether the feature is present and non-zero.
    // Answering it is unimplemented rather than decided: the boolean context
    // has its own truthiness rule per feature, and `false` here is a container
    // query that reads as valid and can never match. The media evaluator holds
    // the same gap.
    case "!!":
      return false;
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
      return false;
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
    // React Native lays out in one writing mode, so the logical axes are the
    // physical ones: inline is horizontal and block is vertical. `inline-size`
    // is also the axis `container-type: inline-size` names, which makes it the
    // feature most container queries are written against.
    case "inline-size":
      return get(containerWidthFamily(containerKey));
    case "block-size":
      return get(containerHeightFamily(containerKey));
    default:
      return;
  }
}
