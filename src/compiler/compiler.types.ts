import type {
  AnimationKeyframes,
  FeatureFlagRecord,
  StyleRule,
  VariableRecord,
} from "../runtime";

export type CompilerOptions = {
  inlineRem?: number | false;
  grouping?: (string | RegExp)[];
  ignorePropertyWarningRegex?: (string | RegExp)[];
  selectorPrefix?: string;
  stylesheetOrder?: number;
  features?: FeatureFlagRecord;
};

export type DarkMode = ["media"] | ["class", string] | ["attribute", string];
export type PathTokens = string | string[];
export type StyleRuleMapping = Record<string, PathTokens | undefined>;

export interface CompilerCollection extends CompilerOptions {
  rules: Map<string, StyleRule[]>;
  keyframes: Map<string, AnimationKeyframes>;
  grouping: RegExp[];
  darkMode?: DarkMode;
  rootVariables: VariableRecord;
  universalVariables: VariableRecord;
  flags: Record<string, unknown>;
  selectorPrefix?: string;
  appearanceOrder: number;
  rem?: number | boolean;
  varUsageCount: Map<string, number>;
}
