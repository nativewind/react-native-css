import { SpecificityArray } from "../runtime.types";

export const Specificity = {
  Order: 0,
  ClassName: 1,
  Important: 2,
  Inline: 3,
  PseudoElements: 4,
  // Id: 0, - We don't support ID yet
  // StyleSheet: 0, - WE don't support multiple stylesheets
};

export const inlineSpecificity: SpecificityArray = [];
inlineSpecificity[Specificity.Inline] = 1;
