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

/** An unset slot ranks as zero, whether it is a hole in memory or the `null` the sheet's JSON transport writes for one. */
const rank = (spec: SpecificityArray, slot: number): number => spec[slot] || 0;

/** Most significant first. */
const slots = [Important, Inline, PseudoElements, ClassName, Order];

export const specificityCompareFn = (
  a: StyleRule | InlineStyleRecord,
  b: StyleRule | InlineStyleRecord,
) => {
  const aSpec = a.s ? a.s : inlineSpecificity;
  const bSpec = b.s ? b.s : inlineSpecificity;

  for (const slot of slots) {
    const difference = rank(aSpec, slot) - rank(bSpec, slot);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
};
