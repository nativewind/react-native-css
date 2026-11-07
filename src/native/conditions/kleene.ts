// Kleene three-valued logic, which MQ5 §3.1 gives a condition holding a term the runtime cannot decide
export type Truth = boolean | "unknown";

export const UNKNOWN = "unknown";

export function negate(value: Truth): Truth {
  return value === UNKNOWN ? UNKNOWN : !value;
}

export function and(left: Truth, right: Truth): Truth {
  if (left === false || right === false) {
    return false;
  }
  return left === UNKNOWN || right === UNKNOWN ? UNKNOWN : true;
}

export function or(left: Truth, right: Truth): Truth {
  if (left === true || right === true) {
    return true;
  }
  return left === UNKNOWN || right === UNKNOWN ? UNKNOWN : false;
}

// A rule applies only on true, so unknown converts to false (MQ5 §3.1)
export function matches(value: Truth): boolean {
  return value === true;
}
