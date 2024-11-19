import type { JSXFunction } from "../runtime.types";

export type * from "../runtime.types";

export const interopComponents = new Map<
  object | string,
  Parameters<JSXFunction>[0]
>();
