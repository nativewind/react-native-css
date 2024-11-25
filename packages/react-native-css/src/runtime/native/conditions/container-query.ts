import { MediaFeatureNameFor_ContainerSizeFeatureId } from "lightningcss";

import {
  ContainerCondition,
  ContainerQuery,
  StyleDescriptor,
} from "../../runtime.types";
import { ContainerContextValue } from "../contexts";
import { containerHeightFamily, containerWidthFamily } from "../globals";
import { Effect } from "../utils/observable";

export const DEFAULT_CONTAINER_NAME = "c:___default___";

export function testContainerQuery(
  query: ContainerQuery,
  inheritedContainers: ContainerContextValue,
  effect: Effect,
): boolean {
  const containerKey = query.n
    ? inheritedContainers[`c:${query.n}`]
    : inheritedContainers[DEFAULT_CONTAINER_NAME];

  if (!containerKey) {
    return false;
  }

  if (query.c && !testContainerQueryCondition(query.c, containerKey, effect)) {
    return false;
  }

  return true;
}

function testContainerQueryCondition(
  condition: ContainerCondition,
  containerKey: WeakKey,
  effect: Effect,
): boolean {
  switch (condition[0]) {
    case "!":
      return !testContainerQueryCondition(condition[1], containerKey, effect);
    case "&":
      return condition[1].every((query) => {
        return testContainerQueryCondition(query, containerKey, effect);
      });
    case "|":
      return condition[1].some((query) => {
        return testContainerQueryCondition(query, containerKey, effect);
      });
    case "!!":
      return false;
    case "[]":
      return false;
    case ">":
    case ">=":
    case "<":
    case "<=":
    case "=": {
      const left = getContainerFeatureValue(condition[1], containerKey, effect);
      const right = condition[2];

      if (condition[0] === "=") {
        return left === right;
      }

      if (typeof left !== "number" || typeof right !== "number") {
        return false;
      }

      switch (condition[0]) {
        case ">":
          return left > right;
        case ">=":
          return left > right;
        case "<":
          return left > right;
        case "<=":
          return left > right;
        default:
          condition[0] satisfies never;
          return false;
      }
    }
    default:
      condition satisfies never;
      return false;
  }
}

function getContainerFeatureValue(
  name: MediaFeatureNameFor_ContainerSizeFeatureId,
  containerKey: WeakKey,
  effect: Effect,
): StyleDescriptor {
  switch (name) {
    case "width":
      return effect.get(containerWidthFamily(containerKey));
    case "height":
      return effect.get(containerHeightFamily(containerKey));
    case "aspect-ratio": {
      const width = effect.get(containerWidthFamily(containerKey));
      const height = effect.get(containerWidthFamily(containerKey));
      return width / height;
    }
    case "orientation":
      const width = effect.get(containerWidthFamily(containerKey));
      const height = effect.get(containerWidthFamily(containerKey));
      return width > height ? "landscape" : "portrait";
    case "inline-size":
    case "block-size":
    default:
      return;
  }
}
