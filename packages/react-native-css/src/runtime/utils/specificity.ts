import type {
  InlineStyleRecord,
  SpecificityArray,
  StyleRule,
} from "../runtime.types";

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

const s = Specificity;

export const specificityCompareFn = (
  a: StyleRule | InlineStyleRecord,
  b: StyleRule | InlineStyleRecord,
) => {
  const aSpec = a.s ? a.s : inlineSpecificity;
  const bSpec = b.s ? b.s : inlineSpecificity;

  if (aSpec[s.Important] !== bSpec[s.Important]) {
    return (aSpec[s.Important] || 0) - (bSpec[s.Important] || 0);
  } else if (aSpec[s.Inline] !== bSpec[s.Inline]) {
    return (aSpec[s.Inline] || 0) - (bSpec[s.Inline] || 0);
  } else if (aSpec[s.PseudoElements] !== bSpec[s.PseudoElements]) {
    return (aSpec[s.PseudoElements] || 0) - (bSpec[s.PseudoElements] || 0);
  } else if (aSpec[s.ClassName] !== bSpec[s.ClassName]) {
    return (aSpec[s.ClassName] || 0) - (bSpec[s.ClassName] || 0);
  } else if (aSpec[s.Order] !== bSpec[s.Order]) {
    return (aSpec[s.Order] || 0) - (bSpec[s.Order] || 0);
  } else {
    return 0;
  }
};
