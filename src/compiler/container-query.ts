import type {
  ContainerSizeFeatureId,
  ContainerCondition as CSSContainerCondition,
} from "lightningcss";

import type { MediaCondition } from "./compiler.types";
import { parseQueryFeature } from "./media-query";
import type { StylesheetBuilder } from "./stylesheet";

const SIZE_FEATURES: ReadonlySet<string> = new Set<ContainerSizeFeatureId>([
  "width",
  "height",
  "inline-size",
  "block-size",
  "aspect-ratio",
  "orientation",
]);

// Chromium and WebKit drop a container query holding an unknown size feature, a keyword its feature does not take or env(), so it compiles to nothing; any other value the runtime cannot resolve leaves its feature unknown (CSS Conditional 5 §5.4)
export function parseContainerCondition(
  condition: CSSContainerCondition,
  builder: StylesheetBuilder,
): MediaCondition | undefined {
  switch (condition.type) {
    case "feature":
      return SIZE_FEATURES.has(condition.value.name)
        ? parseQueryFeature(condition.value, builder)
        : undefined;
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
