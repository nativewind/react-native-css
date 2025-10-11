/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { PlainColorObject } from "colorjs.io";
import {
  ColorSpace,
  to as convert,
  mix,
  OKLab,
  P3,
  parse,
  sRGB,
  type ColorConstructor,
} from "colorjs.io/fn";

import type { StyleFunctionResolver } from "../resolve";

ColorSpace.register(sRGB);
ColorSpace.register(P3);
ColorSpace.register(OKLab);

export const colorMix: StyleFunctionResolver = (resolveValue, value) => {
  const args = resolveValue(value[2]);

  if (!Array.isArray(args) || args.length < 3) {
    return;
  }

  try {
    const space = args.shift();

    let left: ColorConstructor | PlainColorObject = parse(
      args.shift() as string,
    );

    let next = args.shift();

    if (typeof next === "string" && next.endsWith("%")) {
      left.alpha = parseFloat(next) / 100;
      next = args.shift();
    }

    if (next === undefined) {
      if (left.spaceId !== "srgb") {
        left = convert(left, "srgb");
      }

      return `rgba(${(left.coords[0] ?? 0) * 255}, ${(left.coords[1] ?? 0) * 255}, ${(left.coords[2] ?? 0) * 255}, ${left.alpha})`;
    }

    if (typeof next !== "string") {
      return;
    }
    const right = parse(next);

    next = args.shift();
    if (next && typeof next === "string" && next.endsWith("%")) {
      right.alpha = parseFloat(next) / 100;
    }

    const result = mix(left, right, {
      space,
      outputSpace: "srgb",
    });

    return `rgba(${(result.coords[0] ?? 0) * 255}, ${(result.coords[1] ?? 0) * 255}, ${(result.coords[2] ?? 0) * 255}, ${result.alpha})`;
  } catch {
    return;
  }
};
