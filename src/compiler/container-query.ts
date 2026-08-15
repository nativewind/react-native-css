/* eslint-disable */
import type {
  ContainerCondition as CSSContainerCondition,
  QueryFeatureFor_ContainerSizeFeatureId,
} from "lightningcss";

import type { MediaCondition } from "./compiler.types";
import {
  parseMediaFeatureOperand,
  parseMediaFeatureOperator,
} from "./media-query";
import type { StylesheetBuilder } from "./stylesheet";

export function parseContainerCondition(
  condition: CSSContainerCondition,
  builder: StylesheetBuilder,
) {
  let containerQuery = parseContainerQueryCondition(condition, builder);

  // A condition with nothing left to test cannot apply. An operand the compiler
  // could not resolve is not that case: it compiles to `null` and stays in the
  // condition, because a condition that is absent applies to every container
  // while a condition that is present and refused applies to none.
  if (!containerQuery) {
    return;
  }

  return containerQuery;
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
      return query ? ["!", query] : undefined;
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
        parseMediaFeatureOperand(feature.value, builder),
      ];
    case "range":
      return [
        parseMediaFeatureOperator(feature.operator),
        feature.name,
        parseMediaFeatureOperand(feature.value, builder),
      ];
    case "interval":
      return [
        "[]",
        feature.name,
        parseMediaFeatureOperand(feature.start, builder),
        parseMediaFeatureOperator(feature.startOperator),
        parseMediaFeatureOperand(feature.end, builder),
        parseMediaFeatureOperator(feature.endOperator),
      ];
    default:
      feature satisfies never;
      return;
  }
}
