import type {
  ContainerQuery,
  MediaCondition,
  PseudoClassesQuery,
} from "react-native-css/compiler";

import {
  activeFamily,
  containerHeightFamily,
  containerLayoutFamily,
  containerWidthFamily,
  focusFamily,
  hoverFamily,
  type ContainerContextValue,
  type Getter,
} from "../reactivity";
import { testAttributes } from "./attributes";
import {
  compareMediaFeature,
  evaluateCondition,
  testAspectRatio,
  testMediaFeatureInterval,
  type FeatureReader,
  type MeasuredFeatureValue,
  type MediaComparison,
  type MediaFeatureName,
  type MediaInterval,
} from "./compare";
import type { RenderGuard } from "./guards";
import { matches, UNKNOWN, type Truth } from "./kleene";

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
  query: Readonly<ContainerQuery>,
  inheritedContainers: Readonly<ContainerContextValue>,
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
  return evaluateCondition(condition, CONTAINER_FEATURES, {
    containerKey,
    get,
  });
}

interface ContainerFeatureContext {
  readonly containerKey: WeakKey;
  readonly get: Getter;
}

const CONTAINER_FEATURES: FeatureReader<ContainerFeatureContext> = {
  read: (name, { containerKey, get }) =>
    getContainerFeatureValue(name, containerKey, get),
  compare: compareContainerFeature,
};

function compareContainerFeature(
  condition: MediaComparison | MediaInterval,
  { containerKey, get }: ContainerFeatureContext,
): Truth {
  if (condition[1] === "aspect-ratio") {
    const layout = get(containerLayoutFamily(containerKey));

    return layout === undefined
      ? UNKNOWN
      : testAspectRatio(condition, layout.width, layout.height, get);
  }

  // device-aspect-ratio is a feature of the screen, which no container query compiles to
  if (condition[1] === "device-aspect-ratio") {
    return UNKNOWN;
  }

  return condition[0] === "[]"
    ? testMediaFeatureInterval(
        condition,
        getContainerFeatureValue(condition[1], containerKey, get),
        get,
      )
    : compareMediaFeature(
        condition[0],
        getContainerFeatureValue(condition[1], containerKey, get),
        condition[2],
        get,
      );
}

function getContainerFeatureValue(
  name: MediaFeatureName,
  containerKey: WeakKey,
  get: Getter,
): MeasuredFeatureValue {
  switch (name) {
    case "width":
      return get(containerWidthFamily(containerKey));
    case "height":
      return get(containerHeightFamily(containerKey));
    case "aspect-ratio": {
      const layout = get(containerLayoutFamily(containerKey));
      return layout === undefined ? undefined : layout.width / layout.height;
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
