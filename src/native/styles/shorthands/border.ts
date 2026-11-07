import { ShortHandSymbol } from "../constants";
import type { StyleResolver } from "../resolve";
import { shorthandHandler } from "./_handler";

const width = ["borderWidth", "number"] as const;
const style = ["borderStyle", "string"] as const;
const color = ["borderColor", "color", "color"] as const;

// `<line-width> || <line-style> || <color>`, the grammar `border` and the six logical-axis shorthands share
const mappings = [
  [width, style, color],
  [style, color],
  [width, style],
  [style],
];

export const border = shorthandHandler(mappings, []);

const matchBorder = shorthandHandler(mappings, [], "object");

// React Native has no inline-axis prop and no per-edge style, so the inline axis lands on borderStart/borderEnd, the block axis on its physical edges, and a style component is dropped
const axisTargets = {
  borderInline: {
    borderWidth: ["borderStartWidth", "borderEndWidth"],
    borderColor: ["borderStartColor", "borderEndColor"],
  },
  borderInlineStart: {
    borderWidth: ["borderStartWidth"],
    borderColor: ["borderStartColor"],
  },
  borderInlineEnd: {
    borderWidth: ["borderEndWidth"],
    borderColor: ["borderEndColor"],
  },
  borderBlock: {
    borderWidth: ["borderTopWidth", "borderBottomWidth"],
    borderColor: ["borderTopColor", "borderBottomColor"],
  },
  borderBlockStart: {
    borderWidth: ["borderTopWidth"],
    borderColor: ["borderBlockStartColor"],
  },
  borderBlockEnd: {
    borderWidth: ["borderBottomWidth"],
    borderColor: ["borderBlockEndColor"],
  },
} as const;

type AxisTargets = (typeof axisTargets)[keyof typeof axisTargets];

function axisBorderHandler(targets: AxisTargets): StyleResolver {
  return (resolveValue, value, get, options) => {
    const parsed = matchBorder(resolveValue, value, get, options);

    if (typeof parsed !== "object" || !parsed) {
      return;
    }

    const target: Record<string, unknown> = { [ShortHandSymbol]: true };

    if ("borderWidth" in parsed) {
      for (const property of targets.borderWidth) {
        target[property] = parsed.borderWidth;
      }
    }

    if ("borderColor" in parsed) {
      for (const property of targets.borderColor) {
        target[property] = parsed.borderColor;
      }
    }

    return target;
  };
}

export const borderInline = axisBorderHandler(axisTargets.borderInline);
export const borderInlineStart = axisBorderHandler(
  axisTargets.borderInlineStart,
);
export const borderInlineEnd = axisBorderHandler(axisTargets.borderInlineEnd);
export const borderBlock = axisBorderHandler(axisTargets.borderBlock);
export const borderBlockStart = axisBorderHandler(axisTargets.borderBlockStart);
export const borderBlockEnd = axisBorderHandler(axisTargets.borderBlockEnd);
