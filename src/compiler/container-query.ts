/* eslint-disable */
import type {
  ContainerCondition as CSSContainerCondition,
  QueryFeatureFor_ContainerSizeFeatureId,
} from "lightningcss";

import type { CompiledContainerCondition } from "./compiled-condition";
import type { MediaCondition } from "./compiler.types";
import {
  parseMediaFeatureOperator,
  parseMediaFeatureValue,
} from "./media-query";
import type { StylesheetBuilder } from "./stylesheet";

export function parseContainerCondition(
  condition: CSSContainerCondition,
  builder: StylesheetBuilder,
): CompiledContainerCondition {
  const containerQuery = parseContainerQueryCondition(condition, builder);

  // If any of these are undefined, the container query is invalid. An invalid
  // query cannot be shown to match, so it matches nothing — it does not become
  // a query with no condition.
  if (!containerQuery || containerQuery.some((v) => v === undefined)) {
    return { type: "never" };
  }

  return { type: "condition", condition: containerQuery };
}

function parseContainerQueryCondition(
  condition: CSSContainerCondition,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  switch (condition.type) {
    case "feature":
      return parseFeature(condition.value, builder);
    case "not":
      const query = parseContainerCondition(condition.value, builder);
      return query.type === "condition" ? ["!", query.condition] : undefined;
    case "operation":
      const conditions = condition.conditions
        .map((c) => parseContainerQueryCondition(c, builder))
        .filter((v): v is MediaCondition => !!v);

      if (conditions.length === 0) {
        return;
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
    case "style":
      // We don't support these yet
      return;
    default:
      condition satisfies never;
      return;
  }
}

function parseFeature(
  feature: QueryFeatureFor_ContainerSizeFeatureId,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain":
      return [
        "=",
        feature.name,
        parseMediaFeatureValue(feature.value, builder),
      ];
    case "range":
      return [
        parseMediaFeatureOperator(feature.operator),
        feature.name,
        parseMediaFeatureValue(feature.value, builder),
      ];
    case "interval":
      return [
        "[]",
        feature.name,
        parseMediaFeatureValue(feature.start, builder),
        parseMediaFeatureOperator(feature.startOperator),
        parseMediaFeatureValue(feature.end, builder),
        parseMediaFeatureOperator(feature.endOperator),
      ];
    default:
      feature satisfies never;
      return;
  }
}
