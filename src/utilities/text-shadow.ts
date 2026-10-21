/** React Native has no `text-shadow: none`; a transparent shadow with no offset or blur draws nothing, and outranks one a parent Text passes down. */
export const NO_TEXT_SHADOW = {
  color: "transparent",
  offsetX: 0,
  offsetY: 0,
  blurRadius: 0,
} as const;
