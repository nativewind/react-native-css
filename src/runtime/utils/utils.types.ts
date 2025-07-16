/* eslint-disable */
import type {
  ClassicComponentClass,
  ComponentClass,
  ComponentProps,
  ForwardRefExoticComponent,
  FunctionComponent,
} from "react";

import type { DotNotation } from "./dot-notation.types";

export type ReactComponent<P = any> =
  | ClassicComponentClass<P>
  | ComponentClass<P>
  | FunctionComponent<P>
  | ForwardRefExoticComponent<P>;

export type ComponentPropsDotNotation<C extends ReactComponent<any>> =
  DotNotation<ComponentProps<C>>;
