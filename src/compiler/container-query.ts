/* eslint-disable */
import type {
  ContainerCondition as CSSContainerCondition,
  QueryFeatureFor_ContainerSizeFeatureId,
} from "lightningcss";

import type { MediaCondition } from "./compiler.types";
import type { ParserOptions } from "./declarations";
import {
  parseMediaFeatureOperator,
  parseMediaFeatureValue,
} from "./media-query";

export function parseContainerCondition(
  condition: CSSContainerCondition,
  options: ParserOptions,
) {
  let containerQuery = parseContainerQueryCondition(condition, options);

  // If any of these are undefined, the media query is invalid
  if (!containerQuery || containerQuery.some((v) => v === undefined)) {
    return;
  }

  return containerQuery;
}

function parseContainerQueryCondition(
  condition: CSSContainerCondition,
  options: ParserOptions,
): MediaCondition | undefined {
  switch (condition.type) {
    case "feature":
      return parseFeature(condition.value, options);
    case "not":
      const query = parseContainerCondition(condition.value, options);
      return query ? ["!", query] : undefined;
    case "operation":
      const conditions = condition.conditions
        .map((c) => parseContainerQueryCondition(c, options))
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
  options: ParserOptions,
): MediaCondition | undefined {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain":
      return [
        "=",
        feature.name,
        parseMediaFeatureValue(feature.value, options),
      ];
    case "range":
      return [
        parseMediaFeatureOperator(feature.operator),
        feature.name,
        parseMediaFeatureValue(feature.value, options),
      ];
    case "interval":
      return [
        "[]",
        feature.name,
        parseMediaFeatureValue(feature.start, options),
        parseMediaFeatureOperator(feature.startOperator),
        parseMediaFeatureValue(feature.end, options),
        parseMediaFeatureOperator(feature.endOperator),
      ];
    default:
      feature satisfies never;
      return;
  }
}
