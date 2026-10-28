const NON_NEGATIVE_PERCENTAGE = /^\+?(?:\d*\.)?\d+(?:e[+-]?\d+)?%$/i;

// Filter Effects 1: blur takes a non-negative length, hue-rotate an angle or unitless zero, and every other function a non-negative number or percentage
export function readNonNegativeLength(argument: unknown): number | undefined {
  return typeof argument === "number" && argument >= 0 ? argument : undefined;
}

export function readNonNegativeAmount(
  argument: unknown,
): number | string | undefined {
  if (typeof argument === "number") {
    return argument >= 0 ? argument : undefined;
  }

  return typeof argument === "string" && NON_NEGATIVE_PERCENTAGE.test(argument)
    ? argument
    : undefined;
}
