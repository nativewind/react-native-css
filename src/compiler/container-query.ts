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
      // MQ5 § 3.1: the negation of unknown is unknown, so an uncompilable term
      // has to survive negation as a term rather than vanish. The fallback is
      // unreachable today - every `<container-condition>` form below compiles
      // to a term, `style()` to `["?"]` - and is kept because what makes it so
      // is the set of forms this function handles, which the next feature type
      // added to lightningcss changes.
      const query = parseContainerCondition(condition.value, builder);
      return ["!", query ?? ["?"]];
    case "operation":
      // An uncompilable branch becomes an unknown term rather than being
      // filtered out: MQ5 § 3.1 makes `true and unknown` unknown, which
      // dropping the branch would turn into true.
      const conditions = condition.conditions.map(
        (c): MediaCondition =>
          parseContainerQueryCondition(c, builder) ?? ["?"],
      );

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
      // CSS Conditional 5 § 3: an unsupported container feature makes the
      // condition unknown for that element, which is not the same as absent.
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
