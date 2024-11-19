import type { Callback } from "../runtime.types";

export type Config = {
  target: string | false;
  source: string;
  nativeStyleToProp?: Record<string, string | string[]>;
};

// Side effects are things that cannot be performed during a render. They will be invoked during an useEffect
export type SideEffect = Callback;

export type RenderGuard =
  | { type: "prop"; name: string; value: unknown }
  | { type: "variable"; name: string; value: unknown; global?: boolean }
  | { type: "container"; name: string; value: unknown };
