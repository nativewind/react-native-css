import {
  isStyleDescriptorArray,
  Specificity,
  specificityCompareFn,
} from "../runtime/utils";
import type {
  AnimationKeyframes_V2,
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
} from "./compiler.types";
import { toRNProperty, type NormalizeSelector } from "./selectors";

type BuilderMode = "style" | "media" | "container" | "keyframes";

export class StylesheetBuilder {
  animationFrames?: AnimationKeyframes_V2[];
  animationDeclarations: StyleDeclaration[] = [];
  staticDeclarations: Record<string, StyleDescriptor> | undefined;

  stylesheet: ReactNativeCssStyleSheet = {};

  varUsage = new Set<string>();

  private rule: StyleRule = {
    s: [],
  };

  constructor(
    private options: CompilerOptions,
    private mode: BuilderMode = "style",
    private ruleTemplate: StyleRule = {
      s: [],
    },
    private mapping: StyleRuleMapping = {},
    private shared: {
      ruleSets: Record<string, StyleRuleSet>;
      rootVariables?: VariableRecord;
      universalVariables?: VariableRecord;
      animations?: AnimationRecord;
      rem: number;
      ruleOrder: number;
    } = { ruleSets: {}, rem: 14, ruleOrder: 0 },
  ) {}

  fork(mode: BuilderMode) {
    this.shared.ruleOrder++;
    return new StylesheetBuilder(
      this.options,
      mode,
      this.cloneRule(),
      { ...this.mapping },
      this.shared,
    );
  }

  cloneRule({ ...rule } = this.rule): StyleRule {
    rule.s = [...this.rule.s];
    rule.aq &&= [...rule.aq];
    rule.c &&= [...rule.c];
    rule.cq &&= [...rule.cq];
    rule.d &&= [...rule.d];
    rule.m &&= [...rule.m];
    rule.p &&= { ...rule.p };
    rule.v &&= [...rule.v];

    return rule;
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
      stylesheetOptions.vr = Object.entries(this.shared.rootVariables);
    }

    if (this.shared.universalVariables) {
      stylesheetOptions.vu = Object.entries(this.shared.universalVariables);
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

  addWarning(
    _type: "property" | "value" | "function",
    _property: string | number,
  ): void {
    // TODO
  }

  newRule(mapping: StyleRuleMapping, { important = false } = {}) {
    this.mapping = mapping;
    this.staticDeclarations = undefined;
    this.rule = this.cloneRule(this.ruleTemplate);
    this.rule.s[Specificity.Order] = this.shared.ruleOrder;
    if (important) {
      this.rule.s[Specificity.Important] = 1;
    }
  }

  addRuleToRuleSet(name: string, rule = this.rule) {
    if (this.shared.ruleSets[name]) {
      this.shared.ruleSets[name].push(rule);
    } else {
      this.shared.ruleSets[name] = [rule];
    }
  }

  addMediaQuery(condition: MediaCondition) {
    this.rule.m ??= [];
    this.rule.m.push(condition);
  }

  addContainer(value: string[] | false) {
    this.rule.c ??= [];

    if (value === false) {
      this.rule.c = [];
    } else {
      this.rule.c.push(...value.map((name) => `c:${name}`));
    }
  }

  addDescriptor(
    property: string,
    value: StyleDescriptor,
    forceTuple?: boolean,
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
      // If we have enabled variable usage tracking, skip unused variables
      if (
        this.options.stripUnusedVariables &&
        !property.startsWith("--__rn-css") &&
        !this.varUsage.has(property)
      ) {
        return;
      }

      this.rule.v ??= [];
      this.rule.v.push([property.slice(2), value]);
    } else if (isStyleFunction(value)) {
      const [delayed, usesVariables] = postProcessStyleFunction(value);

      this.rule.d ??= [];
      if (value[1] === "@animation") {
        this.rule.a ??= true;
      }

      if (usesVariables) {
        this.rule.dv = 1;
      }

      this.pushDescriptor(
        property,
        value,
        this.rule.d,
        forceTuple,
        delayed || usesVariables,
      );
    } else {
      if (property.startsWith("animation-")) {
        this.rule.a ??= true;
      }

      this.rule.d ??= [];
      this.pushDescriptor(property, value, this.rule.d);
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
    property: string,
    value: StyleDescriptor,
    declarations: StyleDeclaration[],
    forceTuple = false,
    delayed = false,
  ) {
    property = toRNProperty(property);

    let propPath: string | string[] =
      this.mapping[property] ?? this.mapping["*"] ?? property;

    if (Array.isArray(propPath)) {
      const first = propPath[0];

      if (!first) {
        // This should not happen, but if it does, we skip the property
        return;
      }

      if (propPath.length === 1) {
        propPath = first;
      } else {
        forceTuple = true;
      }
    }

    if (isStyleFunction(value)) {
      if (delayed) {
        declarations.push([value, propPath, 1]);
      } else {
        declarations.push([value, propPath]);
      }
    } else if (forceTuple || Array.isArray(propPath)) {
      declarations.push([value, propPath]);
    } else {
      if (!this.staticDeclarations) {
        this.staticDeclarations = {};
        declarations.push(this.staticDeclarations);
      }
      this.staticDeclarations[propPath] = value;
    }
  }

  applyRuleToSelectors(selectorList: NormalizeSelector[]): void {
    if (!this.rule.d && !this.rule.v) {
      return;
    }

    for (const selector of selectorList) {
      const rule = this.cloneRule();

      if (selector.type === "className") {
        const {
          specificity,
          className,
          mediaQuery,
          containerQuery,
          pseudoClassesQuery,
          attributeQuery,
        } = selector;

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

            const containerRule: StyleRule = {
              // These are not "real" rules, so they use the lowest specificity
              s: [0],
              c: [name],
            };

            // Create rules for the parent classes
            this.addRuleToRuleSet(name, containerRule);
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
      } else {
        // These can only have variable declarations
        if (!this.rule.v) {
          continue;
        }

        const { type, subtype } = selector;

        for (const [name, value] of this.rule.v) {
          this.shared[type] ??= {};
          this.shared[type][name] ??= [undefined];
          this.shared[type][name][subtype === "light" ? 0 : 1] = value;
        }
      }
    }
  }

  addContainerQuery(query: ContainerQuery) {
    this.rule.cq ??= [];
    this.rule.cq.push(query);
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
    this.staticDeclarations = undefined;
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
  shouldDelay ||= value[3] === 1;

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
