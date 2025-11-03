import { type ComponentType } from "react";

import type { Config } from "prettier";

import { ContainerContext, VariableContext } from "../reactivity";
import { useDeepWatcher } from "../tracking";

export function useNativeCss<T extends object>(
  type: ComponentType<T>,
  originalProps: Record<string, unknown> | undefined | null,
  configs: Config[] = [{ source: "className", target: "style" }],
) {
  const state = useDeepWatcher(() => {
    return {};
  }, [configs, originalProps, VariableContext, ContainerContext]);

  return null;
}
