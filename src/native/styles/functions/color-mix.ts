import {
  ColorSpace,
  to as convert,
  mix,
  OKLab,
  P3,
  parse,
  sRGB,
} from "colorjs.io/fn";

import type { StyleFunctionResolver } from "../resolve";

ColorSpace.register(sRGB);
ColorSpace.register(P3);
ColorSpace.register(OKLab);

export const colorMix: StyleFunctionResolver = (resolveValue, value) => {
  const resolved = resolveValue(value[2]);
  if (!Array.isArray(resolved)) return;

  // Resolved descriptors may be cached and shared by another styled component.
  const args: unknown[] = [...(resolved as unknown[])];
  try {
    const space = args.shift();
    const leftValue = args.shift();
    if (typeof space !== "string" || typeof leftValue !== "string") return;
    ColorSpace.get(space);
    const left = parse(leftValue);
    const percentage = () => {
      const next = args[0];
      if (typeof next !== "string" || !next.endsWith("%")) return undefined;
      args.shift();
      return Number(next.slice(0, -1)) / 100;
    };
    let leftWeight = percentage();
    const rightValue = args.shift();
    if (typeof rightValue !== "string") return;
    const right = parse(rightValue);
    let rightWeight = percentage();
    if (args.length) return;

    // CSS Color 5: omitted weights are complementary, then both are normalized.
    leftWeight ??= rightWeight === undefined ? 0.5 : 1 - rightWeight;
    rightWeight ??= 1 - leftWeight;
    if (
      ![leftWeight, rightWeight].every(
        (weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1,
      )
    )
      return;
    const sum = leftWeight + rightWeight;
    if (sum === 0) return;
    const alphaMultiplier = Math.min(sum, 1);

    let result;
    if (right.alpha === 0 || left.alpha === 0) {
      // A transparent endpoint contributes no premultiplied channels.
      const source = right.alpha === 0 ? left : right;
      const weight = right.alpha === 0 ? leftWeight : rightWeight;
      result = convert(source, "srgb");
      result.alpha = ((source.alpha ?? 1) * weight) / sum;
    } else {
      result = mix(left, right, rightWeight / sum, {
        space,
        outputSpace: "srgb",
        premultiplied: true,
      });
    }
    result.alpha = (result.alpha ?? 1) * alphaMultiplier;
    return `rgba(${(result.coords[0] ?? 0) * 255}, ${(result.coords[1] ?? 0) * 255}, ${(result.coords[2] ?? 0) * 255}, ${result.alpha})`;
  } catch {
    return;
  }
};
