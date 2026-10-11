import type {
  ContainerSizeFeatureId,
  ContainerCondition as CSSContainerCondition,
  QueryFeatureFor_ContainerSizeFeatureId,
} from "lightningcss";

import type { MediaCondition } from "./compiler.types";
import {
  parseMediaFeatureOperator,
  parseMediaFeatureValue,
} from "./media-query";
import type { StylesheetBuilder } from "./stylesheet";

const SIZE_FEATURES: Record<ContainerSizeFeatureId, true> = {
  "width": true,
  "height": true,
  "inline-size": true,
  "block-size": true,
  "aspect-ratio": true,
  "orientation": true,
};

// A condition holding a size feature the runtime does not know, or a value it cannot resolve, selects no container (CSS Conditional 5 §5.4), so it compiles to nothing
export function parseContainerCondition(
  condition: CSSContainerCondition,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  switch (condition.type) {
    case "feature":
      return parseFeature(condition.value, builder);
    case "not": {
      const query = parseContainerCondition(condition.value, builder);
      return query ? ["!", query] : undefined;
    }
    case "operation": {
      const conditions: MediaCondition[] = [];

      for (const child of condition.conditions) {
        const query = parseContainerCondition(child, builder);

        if (!query) {
          return;
        }

        conditions.push(query);
      }

      switch (condition.operator) {
        case "and":
          return ["&", conditions];
        case "or":
          return ["|", conditions];
        default:
          condition.operator satisfies never;
          return;
      }
    }
    case "style":
      return ["?"];
    default:
      condition satisfies never;
      return;
  }
}

function parseFeature(
  feature: QueryFeatureFor_ContainerSizeFeatureId,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  if (!Object.prototype.hasOwnProperty.call(SIZE_FEATURES, feature.name)) {
    return;
  }

  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain": {
      const value = parseMediaFeatureValue(feature.value, builder);
      return value === undefined ? undefined : ["=", feature.name, value];
    }
    case "range": {
      const value = parseMediaFeatureValue(feature.value, builder);
      return value === undefined
        ? undefined
        : [parseMediaFeatureOperator(feature.operator), feature.name, value];
    }
    case "interval": {
      const start = parseMediaFeatureValue(feature.start, builder);
      const end = parseMediaFeatureValue(feature.end, builder);
      return start === undefined || end === undefined
        ? undefined
        : [
            "[]",
            feature.name,
            start,
            parseMediaFeatureOperator(feature.startOperator),
            end,
            parseMediaFeatureOperator(feature.endOperator),
          ];
    }
    default:
      feature satisfies never;
      return;
  }
}
