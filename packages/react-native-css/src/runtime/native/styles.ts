import {
  Callback,
  InlineStyleRecord,
  Props,
  SharedValueInterpolation,
  StyleDeclaration,
  StyleDescriptor,
  StyleRule,
  Transition,
} from "../runtime.types";
import type { ContainerContextValue, VariableContextValue } from "./contexts";
import { rem, rootVariables, universalVariables } from "./globals";
import { RenderGuard, SideEffect } from "./native.types";
import { applyAnimation, getTransitionSideEffect } from "./reanimated";
import type { ConfigReducerState } from "./reducer";
import type { ResolveOptions } from "./resolvers";
import { resolveValue } from "./resolvers";
import { ShortHandSymbol } from "./resolvers/shorthand";
import { ProduceArray } from "./utils/immutability";
import { Effect } from "./utils/observable";
import { defaultValues, setBaseValue, setValue } from "./utils/properties";

export type Styles = Effect & {
  transitions?: Map<Transition[0], Transition[1]>;
  epoch: number;
  guards: RenderGuard[];
  baseStyles?: Record<string, any>;
  props?: Record<string, any>;
  sideEffects?: SideEffect[];
  animationIO?: SharedValueInterpolation[];
};

export type StateWithStyles = ConfigReducerState & { styles: Styles };

export function buildStyles(
  previous: ConfigReducerState,
  incomingProps: Props,
  inheritedVariables: VariableContextValue,
  inheritedContainers: ContainerContextValue,
  run: () => void,
) {
  let styles: Styles = {
    epoch: previous.styles ? previous.styles.epoch : -1,
    guards: [], // Placeholder will be changed later
    run,
    dependencies: new Set(),
    get(readable) {
      return readable.get(styles);
    },
  };

  if (previous.styles?.baseStyles) {
    styles.baseStyles = { ...previous.styles.baseStyles };
  }

  const delayedStyles: Callback[] = [];

  const guards = new ProduceArray(previous.styles?.guards || [], (a, b) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  });

  const next: StateWithStyles = {
    ...previous,
    styles,
    variables: Object.fromEntries(previous.declarations?.variables ?? []),
  };

  const options: ResolveOptions = {
    getProp: (name: string) => {
      guards?.push(["a", name, incomingProps?.[name]]);
      return incomingProps?.[name] as StyleDescriptor;
    },
    getVariable: (name: string) => {
      let value = resolveValue(next.variables?.[name], options, next.styles);

      // If the value is already defined, we don't need to look it up
      if (value !== undefined) {
        return value;
      }

      // Is there a universal variable?
      value = resolveValue(
        next.styles.get(universalVariables(name)),
        options,
        next.styles,
      );

      // Check if the variable is inherited
      if (value === undefined) {
        if (name in inheritedVariables) {
          value = resolveValue(inheritedVariables[name], options, next.styles);
        }

        /**
         * Create a rerender guard incase the variable changes
         */
        guards.push(["v", name, inheritedVariables[name]]);
      }
      // This is a bit redundant as inheritedVariables probably is rootVariables,
      // but this ensures a subscription is created for Fast Refresh
      value ??= next.styles.get(rootVariables(name));

      return value;
    },
    getContainer: (name: string) => {
      const value = inheritedContainers[name];
      // guards?.push(
      //   ["c", name, value],
      //   (a, b) => a[1] === b[1] && a[2] === b[2],
      // );
      return value;
    },
    getEm() {
      if (next.target === false) return rem.get();
      return next.styles.props?.[next.target]?.fontSize;
    },
    previousTransitions: new Set(previous.styles?.transitions?.keys()),
  };

  if (next.declarations?.normal) {
    applyStyles(
      next,
      previous,
      next.declarations?.normal,
      delayedStyles,
      options,
    );
  }

  applyAnimation(next, styles, options);

  if (next.declarations?.important) {
    applyStyles(
      next,
      previous,
      next.declarations?.important,
      delayedStyles,
      options,
    );
  }

  if (delayedStyles.length) {
    for (const delayedStyle of delayedStyles) {
      delayedStyle();
    }
  }

  /**
   * If we had a transition style that was removed,
   * we need to transition back to the default value
   */
  if (options.previousTransitions) {
    for (let transition of options.previousTransitions) {
      const transitionFn = getTransitionSideEffect(next, previous, transition);

      if (transitionFn) {
        if (typeof transition !== "string") {
          transition = transition[transition.length - 1];
        }
        next.styles.sideEffects ??= [];
        next.styles.sideEffects.push(transitionFn(defaultValues[transition]));
      }
    }
  }

  styles.epoch++;
  styles.guards = guards.commit();
  return next;
}

/**
 * Mutates `next` to apply the styles from `styleRules`
 */
function applyStyles(
  next: StateWithStyles,
  previous: ConfigReducerState,
  styleRules: (StyleRule | InlineStyleRecord)[],
  delayedStyles: Callback[],
  options: ResolveOptions,
) {
  let props = next.styles.props;

  for (const rule of styleRules) {
    if (!rule.s) {
      props ??= {};

      // Inline styles require a target
      if (!next.target) {
        continue;
      }

      props[next.target] ??= {};
      Object.assign(props[next.target], rule);

      continue;
    }

    if (rule.d) {
      for (let declaration of rule.d) {
        props = applyDeclaration(
          next,
          previous,
          props,
          declaration,
          delayedStyles,
          options,
        );
      }
    }
  }

  next.styles.props = props;
}

function applyDeclaration(
  next: StateWithStyles,
  previous: ConfigReducerState,
  props: Record<string, any> | undefined,
  declaration: StyleDeclaration,
  delayedStyles: Callback[],
  options: ResolveOptions,
  canDelay = true,
) {
  if (Array.isArray(declaration)) {
    let value: any = declaration[0];
    let propPath = declaration[1];
    let target: string | false | undefined = next.target;

    if (next.nativeStyleToProp) {
      const lastProp = Array.isArray(propPath)
        ? propPath[propPath.length - 1]
        : propPath;

      if (lastProp in next.nativeStyleToProp) {
        propPath = next.nativeStyleToProp[lastProp];
        target = undefined;
      }
    }

    const transitionFn = getTransitionSideEffect(next, previous, propPath);

    if (Array.isArray(value)) {
      const shouldDelay = canDelay && declaration[2];

      if (shouldDelay) {
        /**
         * We need to delay the resolution of this value until after all
         * styles have been calculated. But another style might override
         * this value. So we set a placeholder value and only override
         * if the placeholder is preserved
         *
         * This also ensures the props exist, so setValue will properly
         * mutate the props object and not create a new one
         */
        const originalValue = value;
        value = {};
        delayedStyles.push(() => {
          const placeholder = value;
          value = resolveValue(originalValue, options, next.styles);

          if (ShortHandSymbol in value) {
            applyShortHand(
              next,
              previous,
              props,
              value,
              delayedStyles,
              options,
            );
            setValue(props, propPath, undefined, target);
          } else {
            if (transitionFn) {
              next.styles.sideEffects ??= [];
              next.styles.sideEffects.push(transitionFn(value));
            } else {
              setValue(props, propPath, value, target, placeholder);
            }
          }
        });
      } else {
        value = resolveValue(value, options, next.styles);

        if (ShortHandSymbol in value) {
          applyShortHand(next, previous, props, value, delayedStyles, options);
          return props;
        }
      }
    }

    // This mutates and/or creates the props object
    if (transitionFn) {
      next.styles.sideEffects ??= [];
      next.styles.sideEffects.push(transitionFn(value));

      next.styles.baseStyles ??= {};
      setBaseValue(next.styles.baseStyles, propPath);

      options.previousTransitions?.delete(propPath);
    } else {
      props = setValue(props, propPath, value, target);
    }
  } else {
    props ??= {};

    if (next.target) {
      if (next.nativeStyleToProp) {
        declaration = { ...declaration };

        for (const key in next.nativeStyleToProp) {
          const value = declaration[key];
          if (value !== undefined) {
            setValue(props, next.nativeStyleToProp[key], value);
            delete declaration[key];
          }
        }

        if (Object.keys(declaration).length > 0) {
          props[next.target] ??= {};
          Object.assign(props[next.target], declaration);
        }
      } else {
        props[next.target] ??= {};
        Object.assign(props[next.target], declaration);
      }

      if (next.declarations?.transition?.p?.length) {
        for (const key in declaration) {
          const transitionFn = getTransitionSideEffect(next, previous, key);

          if (transitionFn) {
            next.styles.sideEffects ??= [];
            next.styles.sideEffects.push(transitionFn(declaration[key]));

            next.styles.baseStyles ??= {};
            next.styles.baseStyles[key] = defaultValues[key];
            options.previousTransitions?.delete(key);
          }
        }
      }
    } else if (next.nativeStyleToProp) {
      // We're trying to assign a style object when target=false.
      // We should only assign the nativeStyleToProp values
      for (const key in next.nativeStyleToProp) {
        const value = declaration[key];
        if (value !== undefined) {
          setValue(props, next.nativeStyleToProp[key], value);
        }
      }
    }
  }

  return props;
}

function applyShortHand(
  next: StateWithStyles,
  previous: ConfigReducerState,
  props: Record<string, any> | undefined,
  declarations: StyleDeclaration[],
  delayedStyles: Callback[],
  options: ResolveOptions,
) {
  for (const declaration of declarations) {
    applyDeclaration(
      next,
      previous,
      props,
      declaration,
      delayedStyles,
      options,
      false,
    );
  }
}
