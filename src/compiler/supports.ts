import type { SupportsCondition } from "lightningcss";

export function supportsConditionValid(condition: SupportsCondition): boolean {
  if (condition.type === "and") {
    return condition.value.every((condition) => {
      return supportsConditionValid(condition);
    });
  } else if (condition.type === "or") {
    return condition.value.some((condition) => {
      return supportsConditionValid(condition);
    });
  } else if (condition.type === "not") {
    return !supportsConditionValid(condition.value);
  } else if (condition.type === "declaration") {
    return Boolean(
      declarations[condition.propertyId.property]?.includes(condition.value),
    );
  }

  return false;
}

const declarations: Record<string, string[]> = {
  // Special text used by TailwindCSS. We should probably change this to all color-mix
  color: ["color-mix(in lab, red, red)"],
};
