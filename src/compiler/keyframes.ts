import type {
  AnimationIterationCount,
  EasingFunction as CSSEasingFunction,
  KeyframesRule,
} from "lightningcss";

import type { StyleDescriptor } from "./compiler.types";
import { parseDeclaration } from "./declarations";
import type { StylesheetBuilder } from "./stylesheet";

export function parseIterationCount(
  value: AnimationIterationCount[],
): (number | "infinite")[] {
  return value.map((value) => {
    return value.type === "infinite" ? value.type : value.value;
  });
}

export function parseEasingFunction(
  value: CSSEasingFunction[],
): StyleDescriptor {
  const easingFn = value.map((value) => {
    switch (value.type) {
      case "linear":
      case "ease":
      case "ease-in":
      case "ease-out":
      case "ease-in-out":
        return value.type;
      case "cubic-bezier":
        return [
          {},
          "cubicBezier",
          [value.x1, value.y1, value.x2, value.y2],
        ] as const;
      case "steps":
        return [{}, "steps", [value.count, value.position?.type]] as const;
    }
  }) as StyleDescriptor[];

  if (easingFn.length === 1) {
    return easingFn[0];
  }
  return easingFn;
}

export function extractKeyFrames(
  keyframes: KeyframesRule,
  builder: StylesheetBuilder,
) {
  builder = builder.fork("keyframes");
  builder.newAnimationFrames(keyframes.name.value);

  for (const frame of keyframes.keyframes) {
    if (!frame.declarations.declarations) continue;

    const selectors = frame.selectors.map((selector) => {
      switch (selector.type) {
        case "percentage":
          return frame.selectors.length > 1
            ? `${selector.value * 100}%`
            : selector.value;
        case "from":
        case "to":
          return selector.type;
        case "timeline-range-percentage":
          // TODO
          return frame.selectors.length > 1
            ? `${selector.value.percentage}%`
            : selector.value.percentage;
      }
    });

    const firstSelector = selectors[0];
    const progress =
      firstSelector && selectors.length === 1
        ? firstSelector.toString()
        : selectors.join(", ");

    builder.newAnimationFrame(progress);

    for (const declaration of frame.declarations.declarations) {
      parseDeclaration(declaration, builder);
    }
  }
}
