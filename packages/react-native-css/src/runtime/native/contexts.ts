import { createContext } from "react";

import type { StyleDescriptor } from "../../compiler";

/**
 * Variables
 */
export type VariableContextValue = Record<string, StyleDescriptor>;
export const VariableContext = createContext<VariableContextValue>({});

/**
 * Containers
 */
export type ContainerContextValue = Record<string, ContainerContextRecord>;
export type ContainerContextRecord = {
  hover?: boolean;
  active?: boolean;
  focus?: boolean;
};
export const ContainerContext = createContext<ContainerContextValue>({});
