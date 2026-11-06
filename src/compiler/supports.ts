import type { Rule, SupportsCondition, SupportsRule } from "lightningcss";

// The compiler keeps or drops an @supports block at build time, so its rules apply unconditionally or not at all
export function rulesTheCompilerKeeps(rule: SupportsRule): Rule[] {
  return supportsConditionValid(rule.condition) ? rule.rules : [];
}

function supportsConditionValid(condition: SupportsCondition): boolean {
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
