import { shorthandHandler } from "./_handler";

const width = ["borderWidth", "number"] as const;
const style = ["borderStyle", "string"] as const;
const color = ["borderColor", "color", "color"] as const;

export const border = shorthandHandler(
  [[width, style, color], [style, color], [width, style], [style]],
  [],
);
