import type { MediaCondition } from "./compiler.types";

/**
 * The result of compiling a conditional group rule's condition — the prelude
 * of an `@media` or `@container` block.
 *
 * The three states exist because two of them are otherwise indistinguishable,
 * and confusing them inverts the rule. "There is no condition to check"
 * (`@media all`) and "the condition could not be compiled" (`@container
 * style(...)`, a feature value this compiler cannot resolve) both yield no
 * `MediaCondition`, but the first means the block always applies and the
 * second means it can never be shown to apply. Treating the second as the
 * first emits the block's declarations with no condition at all, so they apply
 * to every element carrying the class — the opposite of what the author wrote,
 * and worse than dropping the block.
 */
export type CompiledCondition =
  | { type: "always" }
  | { type: "never" }
  | { type: "condition"; condition: MediaCondition };

/**
 * A container query's prelude is always a condition, so unlike `@media` it has
 * no "always" state. Derived rather than restated, so a new state has to be
 * ruled out here deliberately.
 */
export type CompiledContainerCondition = Exclude<
  CompiledCondition,
  { type: "always" }
>;
