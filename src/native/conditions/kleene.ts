// Kleene three-valued logic, which MQ5 §3.1 gives a condition holding a term the runtime cannot decide
export type Truth = boolean | "unknown";

export const UNKNOWN = "unknown";

export function negate(value: Truth): Truth {
  return value === UNKNOWN ? UNKNOWN : !value;
}

// Evaluating a term subscribes to what it reads, so a decided conjunction evaluates no further terms
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

// Evaluating a term subscribes to what it reads, so a decided disjunction evaluates no further terms
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

// A rule applies only on true, so unknown converts to false (MQ5 §3.1)
export function matches(value: Truth): boolean {
  return value === true;
}
