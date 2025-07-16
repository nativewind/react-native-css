/* eslint-disable */
import type { ComponentType } from "react";

import type { StyleDescriptor } from "../../../compiler";
import { StyleCollection } from "../injection";
import { observable, weakFamily, type Getter } from "../reactivity";
import type { SimpleResolveValue, StyleFunctionResolver } from "./resolve";
import { shorthandHandler } from "./shorthand";

const name = ["n", "string", "none"] as const;
const delay = ["de", "number", 0] as const;
const duration = ["du", "number", 0] as const;
const fill = ["f", ["none", "forwards", "backwards", "both"], "none"] as const;
const iteration = ["i", "number", 1] as const;
const playState = ["p", ["running", "paused"], "running"] as const;
const direction = [
  "di",
  ["normal", "reverse", "alternate", "alternate-reverse"],
  "normal",
] as const;
const easing = [
  "e",
  ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
  "ease",
] as const;

export const animationShorthand = shorthandHandler(
  [
    [name],
    [duration, name],
    [name, duration],
    [duration, delay, name],
    [duration, delay, iteration, name],
    [duration, delay, iteration, easing, name],
    [name, duration, easing, delay, iteration, fill],
  ],
  [name, delay, direction, duration, fill, iteration, playState, easing],
);

export const animation: StyleFunctionResolver = (
  resolveValue,
  value,
  get,
  { inheritedVariables },
) => {
  const name = resolveValue(value[2]);

  /**
   * Get a stable reference to the StyleProp observer.
   * We can use that as a WeakKey
   */
  return get(
    animationFamily(get, {
      name,
      resolveValue,
      inheritedVariables,
    }),
  );
};

type AnimationFamilyOptions = {
  name: StyleDescriptor;
  resolveValue: SimpleResolveValue;
  inheritedVariables: any;
};

const animationFamily = weakFamily(
  (_: Getter, options: AnimationFamilyOptions) => {
    const { name: nameDescriptor, resolveValue } = options;

    return observable((get) => {
      const names = resolveValue(nameDescriptor);

      if (!Array.isArray(names)) {
        return;
      }

      return names.map((name: string) => {
        const keyframes = get(StyleCollection.keyframes(name));

        const animation: Record<string, any> = {};

        for (const [progress, declarations] of keyframes) {
          const result: Record<string, any> = {};

          // This code needs to match calculateProps
          // TODO: Refactor this to use the same code
          for (const declaration of declarations) {
            let target = result;

            if (!Array.isArray(declaration)) {
              // Static styles
              Object.assign(target, declaration);
            } else {
              // Dynamic styles
              let value: any = declaration[0];
              let propPath = declaration[1];
              let prop: string | undefined = "";

              if (typeof propPath === "string") {
                prop = propPath;
              } else {
                prop = propPath[0];

                for (
                  let i = 0;
                  i < propPath.length - 2 && typeof prop === "string";
                  i++
                ) {
                  target = target[prop] ??= {};
                  prop = propPath[i + 1];
                }
              }

              value = resolveValue(value);
            }
          }

          animation[progress] = result;
        }

        return animation;
      });
    });
  },
);

export const animatedComponentFamily = weakFamily(
  (component: ComponentType) => {
    if (
      "displayName" in component &&
      component.displayName?.startsWith("Animated.")
    ) {
      return component;
    }

    const createAnimatedComponent =
      require("react-native-reanimated").createAnimatedComponent;

    return createAnimatedComponent(component);
  },
);
