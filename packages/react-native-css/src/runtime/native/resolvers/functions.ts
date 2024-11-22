import type { StyleValueSubResolver } from ".";
import { StyleFunction } from "../../runtime.types";
import { animationShorthand } from "./animation";
import { calc } from "./calc";
import { em } from "./em";
import { resolveVariable } from "./variable";

export const resolveRuntimeFunction: StyleValueSubResolver<StyleFunction> = (
  resolveValue,
  func,
  options,
) => {
  const name = func[1];
  switch (name) {
    case "@animation": {
      return animationShorthand(resolveValue, func, options);
    }
    case "var": {
      return resolveVariable(resolveValue, func, options);
    }
    case "calc": {
      return calc(resolveValue, func, options);
    }
    case "em": {
      return em(resolveValue, func, options);
    }
    default: {
      const args = resolveValue(func[2], options);

      if (args === undefined) {
        return;
      } else if (Array.isArray(args)) {
        return `${name}(${args.join(", ")})`;
      } else {
        return `${name}(${args})`;
      }
    }
  }
};
