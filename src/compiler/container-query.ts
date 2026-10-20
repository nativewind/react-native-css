import type {
  ContainerSizeFeatureId,
  ContainerCondition as CSSContainerCondition,
  QueryFeatureFor_ContainerSizeFeatureId,
} from "lightningcss";

import type { MediaCondition } from "./compiler.types";
import {
  isUnknownKeyword,
  parseFeatureOperand,
  parseMediaFeatureOperator,
} from "./media-query";
import type { StylesheetBuilder } from "./stylesheet";

const SIZE_FEATURES: ReadonlySet<string> = new Set<ContainerSizeFeatureId>([
  "width",
  "height",
  "inline-size",
  "block-size",
  "aspect-ratio",
  "orientation",
]);

// Chromium and WebKit drop a container query holding an unknown size feature or env(), so it compiles to nothing; any other value the runtime cannot resolve leaves its feature unknown (CSS Conditional 5 §5.4)
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
  if (!SIZE_FEATURES.has(feature.name)) {
    return;
  }

  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain": {
      const value = parseFeatureOperand(feature.value, builder);
      return value === undefined || isUnknownKeyword(feature.name, value)
        ? undefined
        : ["=", feature.name, value];
    }
    case "range": {
      const value = parseFeatureOperand(feature.value, builder);
      return value === undefined
        ? undefined
        : [parseMediaFeatureOperator(feature.operator), feature.name, value];
    }
    case "interval": {
      const start = parseFeatureOperand(feature.start, builder);
      const end = parseFeatureOperand(feature.end, builder);
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
