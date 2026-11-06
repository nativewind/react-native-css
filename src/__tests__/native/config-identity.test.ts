import { ScrollView as RNScrollView, View as RNView } from "react-native";

import { generateStateHash } from "../../native/react/rules";
import {
  mappingToConfig,
  type ComponentState,
  type Config,
} from "../../native/react/useNativeCss";
import {
  VAR_SYMBOL,
  type Effect,
  type VariableContextValue,
} from "../../native/reactivity";
import type { StyledConfiguration } from "../../runtime.types";

const ruleFor = (): WeakKey => ({});

const stateFor = (configs: Config[]): ComponentState => {
  const ruleEffect: Effect = { observers: new Set(), run: () => undefined };
  const inheritedVariables: VariableContextValue = { [VAR_SYMBOL]: true };

  return {
    configs,
    inheritedContainers: {},
    inheritedVariables,
    ruleEffect,
    ruleEffectGetter: (observable) => observable.get(ruleEffect),
    styleEffect: { observers: new Set(), run: () => undefined },
  };
};

const viewMapping = {
  className: "style",
} satisfies StyledConfiguration<typeof RNView>;

const scrollViewMapping = {
  className: "style",
  contentContainerClassName: "contentContainerStyle",
} satisfies StyledConfiguration<typeof RNScrollView>;

test("two consumers of one mapping share a cache key", () => {
  const rules = [ruleFor()];

  const first = generateStateHash(
    stateFor(mappingToConfig(viewMapping)),
    rules,
  );
  const second = generateStateHash(
    stateFor(mappingToConfig(viewMapping)),
    rules,
  );

  expect(first).toBe(second);
});

test("mappings that differ keep different cache keys", () => {
  const rules = [ruleFor()];

  const view = generateStateHash(stateFor(mappingToConfig(viewMapping)), rules);
  const scrollView = generateStateHash(
    stateFor(mappingToConfig(scrollViewMapping)),
    rules,
  );

  expect(view).not.toBe(scrollView);
});

test("a mapping that is not an object is refused by name", () => {
  expect(() => mappingToConfig("style" as never)).toThrow(
    /mapping must be an object/u,
  );
  expect(() => mappingToConfig(undefined as never)).toThrow(
    /mapping must be an object/u,
  );
});

test("a mapping mutated after its first use is not re-derived", () => {
  const mapping: Record<string, string> = { className: "style" };
  const first = mappingToConfig(mapping);

  mapping.className = "contentContainerStyle";

  expect(mappingToConfig(mapping)).toBe(first);
});

test("a mapping built per call still produces an equal config", () => {
  expect(mappingToConfig({ className: "style" })).toEqual(
    mappingToConfig(viewMapping),
  );
});
