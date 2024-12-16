/**
 * An opinionated runtime for React Native CSS.
 * @module
 */

export * from "./runtime";
export type * from "./runtime.types";

export {
  createCssElement as createElement,
  Fragment,
} from "../jsx/jsx-runtime";
