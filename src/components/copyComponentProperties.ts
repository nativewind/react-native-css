import type { ComponentType } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export function copyComponentProperties<T extends AnyComponent>(
  BaseComponent: T,
  Component: AnyComponent,
) {
  for (const [key, value] of Object.entries(BaseComponent)) {
    if (key === "$$typeof" || key === "render" || key === "contextType") {
      continue;
    }

    (Component as unknown as Record<string, unknown>)[key] = value;
  }

  Component.displayName = BaseComponent.displayName;

  return Component as unknown as T;
}
