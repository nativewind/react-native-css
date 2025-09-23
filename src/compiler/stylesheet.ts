import type { SelectorList } from "lightningcss";

import {
  isStyleDescriptorArray,
  Specificity,
  specificityCompareFn,
} from "../utilities";
import type {
  AnimationKeyframes,
  AnimationRecord,
  CompilerOptions,
  ContainerQuery,
  MediaCondition,
  ReactNativeCssStyleSheet,
  StyleDeclaration,
  StyleDescriptor,
  StyleFunction,
  StyleRule,
  StyleRuleMapping,
  StyleRuleSet,
  VariableRecord,
  VariableValue,
} from "./compiler.types";
import {
  modifyRuleForPlaceholder,
  modifyRuleForSelection,
} from "./pseudo-elements";
import { getClassNameSelectors, toRNProperty } from "./selector-builder";

type BuilderMode = "style" | "media" | "container" | "keyframes";

const staticDeclarations = new WeakMap<
  WeakKey,
  Record<string, StyleDescriptor>
>();

const extraRules = new WeakMap<StyleRule, Partial<StyleRule>[]>();

const keywords = new Set(["unset"]);

export class StylesheetBuilder {
  animationFrames?: AnimationKeyframes[];
  animationDeclarations: StyleDeclaration[] = [];

  stylesheet: ReactNativeCssStyleSheet = {};

  varUsage = new Set<string>();

  private rule: StyleRule = {
    s: [],
  };

  constructor(
    private options: CompilerOptions,
    public mode: BuilderMode = "style",
    private ruleTemplate: StyleRule = {
      s: [],
    },
    // Any default mapping should be included in the @nativeMapping parsing
    private mapping: StyleRuleMapping = {},
    public descriptorProperty?: string,
    private shared: {
      ruleSets: Record<string, StyleRuleSet>;
      rootVariables?: VariableRecord;
      universalVariables?: VariableRecord;
      animations?: AnimationRecord;
      rem: number;
      ruleOrder: number;
      warningProperty?: string;
      warningProperties: string[];
      warningValues: Record<string, unknown[]>;
      warningFunctions: string[];
    } = {
      ruleSets: {},
      rem: 14,
      ruleOrder: 0,
      warningProperties: [],
      warningValues: {},
      warningFunctions: [],
    },
    private selectors: SelectorList = [],
  ) {}

  fork(mode = this.mode, selectors: SelectorList = []): StylesheetBuilder {
    this.shared.ruleOrder++;

    /**
     * If we already have selectors and we are added more
     * Then these must be nested selectors.
     *
     * We need to extrapolate out the selectors to their full values
     */
    selectors =
      this.selectors.length && selectors.length
        ? this.selectors.flatMap((selectorA) => {
            return selectors.map((selectorB) => [...selectorA, ...selectorB]);
          })
        : [...this.selectors, ...selectors];

    return new StylesheetBuilder(
      this.options,
      mode,
      this.cloneRule(),
      { ...this.mapping },
      this.descriptorProperty,
      this.shared,
      selectors,
    );
  }

  cloneRule({ ...rule } = this.ruleTemplate): StyleRule {
    rule.s = [...rule.s];
    rule.aq &&= [...rule.aq];
    rule.c &&= [...rule.c];
    rule.cq &&= [...rule.cq];
    rule.d &&= [...rule.d];
    rule.m &&= [...rule.m];
    rule.p &&= { ...rule.p };
    rule.v &&= [...rule.v];

    return rule;
  }

  private createRuleFromPartial(rule: StyleRule, partial: Partial<StyleRule>) {
    rule = this.cloneRule(rule);

    if (partial.m) {
      rule.m ??= [];
      rule.m.push(...partial.m);
    }

    if (partial.d) {
      rule.d = partial.d;
    }

    return rule;
  }

  extendRule(rule: Partial<StyleRule>) {
    return this.cloneRule({ ...this.rule, ...rule });
  }

  getOptions(): CompilerOptions {
    return this.options;
  }

  setOptions<T extends keyof CompilerOptions>(
    key: T,
    value: CompilerOptions[T],
  ) {
    this.options[key] = value;
  }

  getNativeStyleSheet(): ReactNativeCssStyleSheet {
    const stylesheetOptions: ReactNativeCssStyleSheet = {};

    const ruleSets = this.getRuleSets();
    if (ruleSets) {
      stylesheetOptions.s = ruleSets;
    }

    if (this.shared.rootVariables) {
      stylesheetOptions.vr = Object.entries(this.shared.rootVariables).map(
        // Reverse these so the most specific variables are first
        ([key, value]) => [key, value.reverse()] as const,
      );
    }

    if (this.shared.universalVariables) {
      stylesheetOptions.vu = Object.entries(this.shared.universalVariables).map(
        // Reverse these so the most specific variables are first
        ([key, value]) => [key, value.reverse()] as const,
      );
    }

    if (this.shared.animations) {
      stylesheetOptions.k = Object.entries(this.shared.animations);
    }

    return stylesheetOptions;
  }

  getRuleSets() {
    const entries = Object.entries(this.shared.ruleSets);

    if (!entries.length) {
      return;
    }

    return Object.entries(this.shared.ruleSets).map(
      ([key, value]) =>
        [key, value.sort((a, b) => specificityCompareFn(a, b))] as const,
    );
  }

  setWarningProperty(property: string) {
    this.shared.warningProperty = property;
  }

  addWarning(type: "property" | "value", property: string): void;
  addWarning(type: "style", property: string, value: unknown): void;
  addWarning(
    type: "property" | "style" | "value",
    property: string,
    value?: unknown,
  ): void {
    switch (type) {
      case "property":
        this.shared.warningProperties.push(property);
        break;
      case "value": {
        value = property;
        property = this.shared.warningProperty ?? "";

        if (!property) {
          return;
        }

        this.shared.warningValues[property] ??= [];
        this.shared.warningValues[property]?.push(value);
        break;
      }
      case "style":
        this.shared.warningValues[property] ??= [];
        this.shared.warningValues[property]?.push(value);
        break;
    }
  }

  getWarnings() {
    const result: {
      properties?: string[];
      values?: Record<string, unknown[]>;
      functions?: string[];
    } = {};

    if (this.shared.warningProperties.length) {
      result.properties = this.shared.warningProperties;
    }

    if (Object.keys(this.shared.warningValues).length) {
      result.values = this.shared.warningValues;
    }

    if (this.shared.warningFunctions.length) {
      result.functions = this.shared.warningFunctions;
    }

    return result;
  }

  addMapping(mapping: StyleRuleMapping) {
    this.mapping = { ...this.mapping, ...mapping };
  }

  newRule(mapping = this.mapping, { important = false } = {}) {
    this.mapping = mapping;
    this.rule = this.cloneRule(this.ruleTemplate);
    this.rule.s[Specificity.Order] = this.shared.ruleOrder;
    if (important) {
      this.rule.s[Specificity.Important] = 1;
    }
  }

  /** Used by nested declarations (for example @media inside a RuleSet) */
  newNestedRule({ important = false, mapping = this.mapping } = {}) {
    this.newRule(mapping, { important });
  }

  /** Hack for light-dark, which requires adding a new rule without changing the current rule */
  addExtraRule(rule: Partial<StyleRule>) {
    let extraRuleArray = extraRules.get(this.rule);
    if (!extraRuleArray) {
      extraRuleArray = [];
      extraRules.set(this.rule, extraRuleArray);
    }
    extraRuleArray.push(rule);
  }

  private addRuleToRuleSet(name: string, rule = this.rule) {
    if (this.shared.ruleSets[name]) {
      this.shared.ruleSets[name].push(rule);
    } else {
      this.shared.ruleSets[name] = [rule];
    }
  }

  addMediaQuery(condition: MediaCondition) {
    this.ruleTemplate.m ??= [];
    this.ruleTemplate.m.push(condition);
  }

  addContainer(value: string[] | false) {
    this.rule.c ??= [];

    if (value === false) {
      this.rule.c = [];
    } else {
      this.rule.c.push(...value.map((name) => `c:${name}`));
    }
  }

  addUnnamedDescriptor(
    value: StyleDescriptor,
    forceTuple?: boolean,
    rule = this.rule,
  ) {
    if (this.descriptorProperty === undefined) {
      return;
    }

    this.addDescriptor(this.descriptorProperty, value, forceTuple, rule);
  }

  addDescriptor(
    property: string,
    value: StyleDescriptor,
    forceTuple?: boolean,
    rule = this.rule,
  ) {
    if (value === undefined) {
      return;
    }

    if (this.mode === "keyframes") {
      property = toRNProperty(property);
      this.pushDescriptor(
        property,
        value,
        this.animationDeclarations,
        forceTuple,
      );
    } else if (property.startsWith("--")) {
      rule.v ??= [];
      rule.v.push([property.slice(2), value]);
    } else if (isStyleFunction(value)) {
      const [delayed, usesVariables] = postProcessStyleFunction(value);

      rule.d ??= [];
      if (
        value[1].startsWith("animation") ||
        value[1].startsWith("transition")
      ) {
        rule.a ??= true;
      }

      if (usesVariables) {
        rule.dv = 1;
      }

      this.pushDescriptor(
        property,
        value,
        rule.d,
        forceTuple,
        delayed || usesVariables,
      );
    } else {
      if (
        property.startsWith("animation-") ||
        property.startsWith("transition-") ||
        property === "transition"
      ) {
        rule.a ??= true;
      }

      rule.d ??= [];
      this.pushDescriptor(property, value, rule.d);
    }
  }

  addShorthand(property: string, options: Record<string, StyleDescriptor>) {
    if (allEqual(...Object.values(options))) {
      this.addDescriptor(property, Object.values(options)[0]);
    } else {
      for (const [name, value] of Object.entries(options)) {
        this.addDescriptor(name, value);
      }
    }
  }

  private pushDescriptor(
    rawProperty: string,
    value: StyleDescriptor,
    declarations: StyleDeclaration[],
    forceTuple = false,
    delayed = false,
  ) {
    const property = toRNProperty(rawProperty);

    let propPath: string | string[] | undefined =
      this.mapping[rawProperty] ?? this.mapping[property] ?? this.mapping["*"];

    if (typeof property === "string" && property.includes(".")) {
      propPath = property.split(".");
    }

    if (Array.isArray(propPath)) {
      const [first, second] = propPath;

      if (propPath.length === 2 && first === "*" && second) {
        propPath = second;
      } else {
        forceTuple = true;
      }
    }

    propPath ??= property;

    if (forceTuple && !Array.isArray(propPath)) {
      propPath = [propPath];
    }

    if (isStyleFunction(value) || Array.isArray(propPath)) {
      if (delayed) {
        declarations.push([value, propPath, 1]);
      } else {
        declarations.push([value, propPath]);
      }
    } else if (Array.isArray(value) && value.some(isStyleFunction)) {
      declarations.push([value, propPath]);
    } else if (typeof value === "string" && keywords.has(value)) {
      declarations.push([value, propPath]);
    } else if (typeof propPath === "string") {
      let staticDeclarationRecord = staticDeclarations.get(declarations);
      if (!staticDeclarationRecord) {
        staticDeclarationRecord = {};
        staticDeclarations.set(declarations, staticDeclarationRecord);
        declarations.push(staticDeclarationRecord);
      }
      staticDeclarationRecord[propPath] = value;
    }
  }

  applyRuleToSelectors(selectorList = this.selectors): void {
    if (!selectorList.length) {
      // If there are no selectors, we cannot apply the rule
      return;
    }

    if (!this.rule.d && !this.rule.v && !this.rule.c) {
      return;
    }

    const normalizedSelectors = getClassNameSelectors(
      selectorList,
      this.options,
    );

    for (const selector of normalizedSelectors) {
      // We are going to be apply the current rule to n selectors, so we clone the rule
      let rule: StyleRule | undefined = this.cloneRule(this.rule);

      if (selector.type === "className" && selector.pseudoElementQuery) {
        if (selector.pseudoElementQuery.includes("selection")) {
          rule = modifyRuleForSelection(rule);
        } else if (selector.pseudoElementQuery.includes("placeholder")) {
          rule = modifyRuleForPlaceholder(rule);
        }
      }

      if (!rule) {
        continue;
      }

      if (selector.type === "className") {
        const {
          specificity,
          className,
          mediaQuery,
          containerQuery,
          pseudoClassesQuery,
          attributeQuery,
        } = selector;

        if (!className) {
          continue; // No className, nothing to do
        }

        // Combine the specificity of the selector with the rule's specificity
        for (let i = 0; i < specificity.length; i++) {
          const spec = specificity[i];
          if (!spec) continue;
          rule.s[i] = spec + (rule.s[i] ?? 0);
        }

        if (mediaQuery) {
          rule.m ??= [];
          rule.m.push(...mediaQuery);
        }

        if (containerQuery) {
          rule.cq ??= [];
          rule.cq.push(...containerQuery);

          for (const query of containerQuery) {
            const name = query.n;

            if (typeof name !== "string") {
              continue;
            }

            const [first, ...rest] = name.slice(2).split(".");

            if (typeof first !== "string") {
              continue;
            }

            const containerRule: StyleRule = {
              // These are not "real" rules, so they use the lowest specificity
              s: [0],
              c: [name],
            };

            if (rest.length) {
              containerRule.aq = rest.map((attr) => [
                "a",
                "className",
                "*=",
                attr,
              ]);
            }

            // Create rules for the parent classes
            this.addRuleToRuleSet(first, containerRule);
          }
        }

        if (pseudoClassesQuery) {
          rule.p = { ...rule.p, ...pseudoClassesQuery };
        }

        if (attributeQuery) {
          rule.aq ??= [];
          rule.aq.push(...attributeQuery);
        }

        this.addRuleToRuleSet(className, rule);

        const extraRulesArray = extraRules.get(this.rule);
        if (extraRulesArray) {
          for (const extraRule of extraRulesArray) {
            this.addRuleToRuleSet(
              className,
              this.createRuleFromPartial(rule, extraRule),
            );
          }
        }
      } else {
        // These can only have variable declarations
        if (!this.rule.v) {
          continue;
        }
        const { type } = selector;
        for (const [name, value] of this.rule.v) {
          this.shared[type] ??= {};
          this.shared[type][name] ??= [];
          const mediaQueries = this.rule.m;
          const variableValue: VariableValue = mediaQueries
            ? [value, [...mediaQueries]]
            : [value];
          // Append extra media queries if they exist
          this.shared[type][name].push(variableValue);

          if (type === "rootVariables" && name === "__rn-css-em") {
            const remName = "__rn-css-rem";
            this.shared[type][remName] ??= [];
            this.shared[type][remName].push(variableValue);
          }
        }
      }
    }
  }

  addContainerQuery(query: ContainerQuery) {
    this.ruleTemplate.cq ??= [];
    this.ruleTemplate.cq.push(query);
  }

  newAnimationFrames(name: string) {
    this.shared.animations ??= {};

    this.animationFrames = this.shared.animations[name];
    if (!this.animationFrames) {
      this.animationFrames = [];
      this.shared.animations[name] = this.animationFrames;
    }
  }

  newAnimationFrame(progress: string) {
    if (!this.animationFrames) {
      throw new Error(
        "No animation frames defined. Call newAnimationFrames first.",
      );
    }

    this.animationDeclarations = [];
    this.animationFrames.push([progress, this.animationDeclarations]);
  }
}

function isStyleFunction(
  value: StyleDescriptor | StyleDescriptor[],
): value is StyleFunction {
  return Boolean(
    Array.isArray(value) &&
      value.length > 0 &&
      value[0] &&
      typeof value[0] === "object" &&
      Object.keys(value[0]).length === 0,
  );
}

function postProcessStyleFunction(value: StyleDescriptor): [
  // Should it be delayed
  boolean,
  // Does it use variables
  boolean,
] {
  if (!Array.isArray(value)) {
    return [false, false];
  }

  if (isStyleDescriptorArray(value)) {
    let shouldDelay = false;
    let usesVariables = false;
    for (const v of value) {
      const [delayed, variables] = postProcessStyleFunction(v);
      shouldDelay ||= delayed;
      usesVariables ||= variables;
    }

    return [shouldDelay, usesVariables];
  }

  let [shouldDelay, usesVariables] = postProcessStyleFunction(value[2]);

  usesVariables ||= value[1] === "var";
  shouldDelay ||= value[3] === 1 || usesVariables;

  if (shouldDelay) {
    return [true, usesVariables];
  }

  return [false, false];
}

function allEqual(...params: unknown[]) {
  return params.every((param, index, array) => {
    return index === 0 ? true : equal(array[0], param);
  });
}

function equal(a: unknown, b: unknown) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!equal(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key in a) {
      if (
        !equal(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      )
        return false;
    }
    return true;
  }

  return false;
}
