import { ShortHandSymbol } from "../constants";
import type { StyleResolver } from "../resolve";
import { shorthandHandler } from "./_handler";

const width = ["borderWidth", "number"] as const;
const style = ["borderStyle", "string"] as const;
const color = ["borderColor", "color", "color"] as const;

/**
 * `<line-width> || <line-style> || <color>`, in the component orders a
 * resolved runtime value can arrive in. `border` and the six logical-axis
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
 * Which React Native props each matched slot feeds, per logical-axis shorthand.
 *
 * The two axes reach different props because React Native supports them
 * differently. The inline axis has no native prop of its own, so it maps onto
 * the RTL-aware `borderStart*` / `borderEnd*` pair. The block axis maps onto
 * the physical edges: its WIDTHS exist only in `BaseViewConfig.ios.js`, so a
 * `borderBlockWidth` paints on iOS and nowhere else, and its axis-wide COLOUR
 * is real on both platforms but ordered against `borderTopColor` oppositely by
 * each — Android has `borderTopColor` outrank it, iOS the reverse — so a
 * `borderBlock` that emitted `borderBlockColor` could not be overridden by a
 * `border-block-color` declared after it without the two platforms
 * disagreeing about which won. `src/compiler/declarations.ts`'s
 * `axisExpansion` carries the platform reads; the compiler makes the same
 * choice there, which is what keeps the two routes one behaviour. Block start
 * is the top edge and block end the bottom one on every platform, because
 * `direction` never flips the block axis.
 *
 * `borderStyle` is absent from every entry deliberately. React Native has no
 * per-edge border style at any layer: `BaseViewConfig.{android,ios}.js` lists
 * `borderStyle` and nothing per-edge, `ViewStyle` declares only `borderStyle`,
 * and Android's `BorderDrawable` holds a single style for the whole border
 * path. Widening it to `borderStyle` would paint the edges the declaration
 * never mentioned and clobber a `border-style` set elsewhere in the cascade,
 * so the component is dropped — exactly as the parsed path drops it for the
 * shorthands and for the `border-{inline,block}-*-style` longhands.
 */
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

/**
 * A logical-axis border shorthand whose value stayed opaque until runtime.
 *
 * The resolved components are matched against the same grammar `border` uses,
 * then fanned onto that axis's per-edge props. `ShortHandSymbol` is what lets
 * one descriptor write several props: the style object it marks is spread onto
 * the target rather than assigned under the shorthand's own name.
 */
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
