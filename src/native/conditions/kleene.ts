/**
 * Kleene three-valued logic, as CSS Media Queries 5 § 3.1 defines it.
 *
 * A term the runtime cannot decide is `unknown`, not `false`. The distinction
 * only shows up under `not`: MQ5 adopted this logic precisely because in
 * two-valued logic "the only reasonable value is false, but this means that
 * `not unknown(function)` is true, which can be confusing and unwanted".
 *
 * The combinators take the terms and an evaluator rather than already-evaluated
 * values, so a decided conjunction never evaluates the rest. That matters here
 * beyond the arithmetic: evaluating a term reads reactive observables, and
 * reading one subscribes to it. Staying lazy keeps the subscription set to the
 * operands that actually decided the answer.
 */

export type Truth = boolean | "unknown";

export const UNKNOWN = "unknown";

/** MQ5 § 3.1: "The negation of unknown is unknown." */
export function negate(value: Truth): Truth {
  return value === UNKNOWN ? UNKNOWN : !value;
}

/**
 * MQ5 § 3.1: true if all terms are true, false if at least one is false, and
 * unknown otherwise.
 */
export function conjoin<Term>(
  terms: readonly Term[],
  evaluate: (term: Term) => Truth,
): Truth {
  let unknown = false;

  for (const term of terms) {
    const value = evaluate(term);

    if (value === false) {
      return false;
    }

    if (value === UNKNOWN) {
      unknown = true;
    }
  }

  return unknown ? UNKNOWN : true;
}

/**
 * MQ5 § 3.1: false if all terms are false, true if at least one is true, and
 * unknown otherwise.
 */
export function disjoin<Term>(
  terms: readonly Term[],
  evaluate: (term: Term) => Truth,
): Truth {
  let unknown = false;

  for (const term of terms) {
    const value = evaluate(term);

    if (value === true) {
      return true;
    }

    if (value === UNKNOWN) {
      unknown = true;
    }
  }

  return unknown ? UNKNOWN : false;
}

/**
 * MQ5 § 3.1: "If the result of any of the above productions is used in any
 * context that expects a two-valued boolean, 'unknown' must be converted to
 * 'false'." A conditional group rule is that context.
 */
export function matches(value: Truth): boolean {
  return value === true;
}
