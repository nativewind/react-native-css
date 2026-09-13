/* eslint-disable */
import type { SpecificityArray, StyleRule } from "../compiler";
import type { InlineStyleRecord } from "../runtime.types";

export const Specificity = {
  Order: 0,
  ClassName: 1,
  Important: 2,
  Inline: 3,
  PseudoElements: 4,
  PseudoClass: 1,
  // Id: 0, - We don't support ID yet
  // StyleSheet: 0, - We don't support multiple stylesheets
};

const Important = Specificity.Important;
const Inline = Specificity.Inline;
const PseudoElements = Specificity.PseudoElements;
const ClassName = Specificity.ClassName;
const Order = Specificity.Order;

export const inlineSpecificity: SpecificityArray = [];
inlineSpecificity[Specificity.Inline] = 1;

/**
 * What a slot is worth. An unset slot is worth nothing, however it is spelled.
 *
 * A specificity array is SPARSE: a rule that sets `PseudoElements` never writes
 * `Important` or `Inline`, so those sit as holes inside the array's length. A
 * hole reads as `undefined` in memory, and the sheet reaches a native runtime
 * through `JSON.stringify` (`metro/injection-code.ts`), which has no holes and
 * writes each one as `null`. Both mean "unset", so both must rank the same.
 */
const rank = (spec: SpecificityArray, slot: number): number => spec[slot] || 0;

/** Most significant first. */
const slots = [Important, Inline, PseudoElements, ClassName, Order];

export const specificityCompareFn = (
  a: StyleRule | InlineStyleRecord,
  b: StyleRule | InlineStyleRecord,
) => {
  const aSpec = a.s ? a.s : inlineSpecificity;
  const bSpec = b.s ? b.s : inlineSpecificity;

  // Compare the RANKED value, never the raw slot. Branching on the raw slot
  // while returning a normalised difference is what let `undefined !== null`
  // enter a branch and answer `0 - 0`, settling the comparison at a slot
  // neither rule uses and leaving the caller to fall back on source order.
  for (const slot of slots) {
    const difference = rank(aSpec, slot) - rank(bSpec, slot);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
};
