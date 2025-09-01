import type { StyleDescriptor, VariableValue } from "react-native-css/compiler";

import { testMediaQuery } from "../runtime/native/conditions/media-query";
import {
  family,
  observable,
  type Observable,
} from "../runtime/native/reactivity";

const rootVariableFamily = () => {
  return family<string, Observable<StyleDescriptor, VariableValue[]>>(() => {
    const obs = observable<StyleDescriptor, VariableValue[]>(
      (read, variableValue) => {
        if (!variableValue) return undefined;

        for (const [value, mediaQuery] of variableValue) {
          if (!mediaQuery) {
            return value;
          }

          if (testMediaQuery(mediaQuery, read)) {
            return value;
          }
        }

        return undefined;
      },
    );

    return obs;
  });
};

export const rootVariables = rootVariableFamily();
export const universalVariables = rootVariableFamily();

rootVariables("__rn-css-rem").set([[14]]);
