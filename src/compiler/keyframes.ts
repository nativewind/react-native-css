/* eslint-disable */
import type {
  AnimationIterationCount,
  EasingFunction as CSSEasingFunction,
  Declaration,
  KeyframesRule,
} from "lightningcss";

import { addAnimation_V2 } from "./add";
import type {
  AnimationKeyframes_V2,
  CompilerCollection,
  EasingFunction,
  StyleDeclaration,
} from "./compiler.types";
import { parseDeclaration } from "./declarations";

export function parseIterationCount(
  value: AnimationIterationCount[],
): number[] {
  return value.map((value) => {
    return value.type === "infinite" ? -1 : value.value;
  });
}

export function parseEasingFunction(
  value: CSSEasingFunction[],
): EasingFunction[] {
  return value.map((value) => {
    switch (value.type) {
      case "linear":
      case "ease":
      case "ease-in":
      case "ease-out":
      case "ease-in-out":
        return value.type;
      case "cubic-bezier":
        return value;
      case "steps":
        return {
          type: "steps",
          c: value.count,
          p: value.position?.type,
        };
    }
  });
}

export function extractKeyFrames(
  keyframes: KeyframesRule<Declaration>,
  collection: CompilerCollection,
) {
  return extractKeyFrames_v2(keyframes, collection);
}

function extractKeyFrames_v2(
  keyframes: KeyframesRule<Declaration>,
  collection: CompilerCollection,
) {
  const animation: AnimationKeyframes_V2[] = [];

  for (const frame of keyframes.keyframes) {
    if (!frame.declarations.declarations) continue;

    const selectors = frame.selectors.map((selector) => {
      switch (selector.type) {
        case "percentage":
          return frame.selectors.length > 1
            ? `${selector.value}%`
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

    const declarations: StyleDeclaration[] = [];
    const addFn = addAnimation_V2(declarations);

    const currentFrame: AnimationKeyframes_V2 =
      selectors.length > 1
        ? [selectors.join(", "), []]
        : [selectors[0]!, declarations];

    for (const declaration of frame.declarations.declarations) {
      parseDeclaration(declaration, collection, addFn, () => {});
    }

    if (declarations.length > 0) {
      animation.push(currentFrame);
    }
  }

  collection.keyframes.set(keyframes.name.value, animation);
}
