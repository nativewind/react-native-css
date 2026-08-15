import { ShortHandSymbol } from "../constants";
import type { StyleResolver } from "../resolve";
import { shorthandHandler } from "./_handler";

const width = ["borderWidth", "number"] as const;
const style = ["borderStyle", "string"] as const;
const color = ["borderColor", "color", "color"] as const;

/**
 * `<line-width> || <line-style> || <color>`, in the component orders a
 * resolved runtime value can arrive in. `border` and the three inline-axis
 * shorthands share the same grammar, so it is stated once here rather than
 * copied per handler.
 */
const mappings = [
  [width, style, color],
  [style, color],
  [width, style],
  [style],
];

export const border = shorthandHandler(mappings, []);

const matchBorder = shorthandHandler(mappings, [], "object");

/**
 * Which React Native props each matched slot feeds, per inline-axis shorthand.
 *
 * `borderStyle` is absent from every entry deliberately. React Native has no
 * per-edge border style at any layer: `BaseViewConfig.{android,ios}.js` lists
 * `borderStyle` and nothing per-edge, `ViewStyle` declares only `borderStyle`,
 * and Android's `BorderDrawable` holds a single style for the whole border
 * path. Widening it to `borderStyle` would paint the block edges the
 * declaration never mentioned and clobber a `border-style` set elsewhere in
 * the cascade, so the component is dropped — exactly as the parsed path drops
 * it for `border-inline` and for the `border-inline-*-style` longhands.
 */
const inlineTargets = {
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
} as const;

type InlineTargets = (typeof inlineTargets)[keyof typeof inlineTargets];

/**
 * An inline-axis border shorthand whose value stayed opaque until runtime.
 *
 * The resolved components are matched against the same grammar `border` uses,
 * then fanned onto the RTL-aware per-edge props. `ShortHandSymbol` is what
 * lets one descriptor write several props: the style object it marks is spread
 * onto the target rather than assigned under the shorthand's own name.
 */
function inlineBorderHandler(targets: InlineTargets): StyleResolver {
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

export const borderInline = inlineBorderHandler(inlineTargets.borderInline);
export const borderInlineStart = inlineBorderHandler(
  inlineTargets.borderInlineStart,
);
export const borderInlineEnd = inlineBorderHandler(
  inlineTargets.borderInlineEnd,
);
