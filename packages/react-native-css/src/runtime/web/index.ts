import { StyleSheet as RNStyleSheet } from "react-native";

import type { JSXFunction } from "../runtime.types";

export { createElement, Fragment } from "react";

export type * from "../runtime.types";
export * from "./api";

export const StyleSheet = Object.assign({}, RNStyleSheet, {
  register: () => {},
});

export const interopComponents = new Map<
  object | string,
  Parameters<JSXFunction>[0]
>();
