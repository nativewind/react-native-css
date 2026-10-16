/** css-values-4 §6.2 fixes each absolute length unit against the inch (1in = 96px) rather than the device. */
export const ABSOLUTE_UNIT_PIXELS = {
  cm: 96 / 2.54,
  in: 96,
  mm: 96 / 25.4,
  pc: 16,
  pt: 96 / 72,
  q: 96 / 101.6,
} as const satisfies Record<string, number>;
