import type { ComponentProps } from "react";

import { Circle as OriginalCircle } from "react-native-svg";

import { useCssElement } from "../runtime";

export * from "react-native-svg";

export function Circle(props: ComponentProps<typeof OriginalCircle>) {
  return useCssElement(OriginalCircle, props, { className: { target: false } });
}
