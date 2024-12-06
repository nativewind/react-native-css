import type { ContainerQuery, StyleDescriptor } from "../../compiler";
import type { Callback } from "../runtime.types";
import { ProduceArray } from "./utils/immutability";

export type Config = {
  target: string | false;
  source: string;
  nativeStyleToProp?: Record<string, string | string[]>;
};

// Side effects are things that cannot be performed during a render. They will be invoked during an useEffect
export type SideEffect = Callback;

export type ImmutableGuards = ProduceArray<RenderGuard[]>;

export type RenderGuard =
  | ["a", string, any]
  | ["c", ContainerQuery, boolean]
  | ["d", string, any]
  | ["v", string, StyleDescriptor];
