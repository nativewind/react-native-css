import type {
  Declaration,
  DeclarationBlock,
  StyleSheet,
  TokenOrValue,
} from "lightningcss";

import type { UniqueVarInfo } from "./compiler.types";
import { soleCSSWideKeyword } from "./css-wide-keywords";

type Rule = StyleSheet["rules"][number];

type BlockRewrite = (
  block: DeclarationBlock | undefined,
) => DeclarationBlock | undefined;

type UnparsedDeclaration = Extract<Declaration, { property: "unparsed" }>;

// Names the properties a var() substituted in one declaration list, since only the second pass's parse knows whether each takes its value
const SUBSTITUTED_PROPERTIES = "--__rn-css-substituted";

// The library variable a substitution the second pass cannot parse reads its value through, named for its property
const SUBSTITUTION_PREFIX = "--__rn-css-substitution-";

export function inlineVariables(
  stylesheet: StyleSheet,
  vars: Map<string, UniqueVarInfo>,
) {
  // A variable two rules declare has a value per element, so it leaves before any value that reads it is flattened
  for (const [name, info] of [...vars]) {
    if (info.count !== 1) {
      vars.delete(name);
    }
  }

  const keptForRuntime = new Set<string>();

  for (const name of [...vars.keys()]) {
    flattenVar(name, vars, keptForRuntime);
  }

  stylesheet.rules = stylesheet.rules
    .map((rule) =>
      rewriteRule(rule, (block) =>
        replaceDeclarationBlock(block, vars, keptForRuntime),
      ),
    )
    .map((rule) =>
      rewriteRule(rule, (block) =>
        removeInlinedDeclarations(block, vars, keptForRuntime),
      ),
    );

  return stylesheet;
}

function rewriteRule(rule: Rule, rewriteBlock: BlockRewrite): Rule {
  switch (rule.type) {
    case "custom":
    case "font-face":
    case "font-palette-values":
    case "font-feature-values":
    case "namespace":
    case "layer-statement":
    case "property":
    case "view-transition":
    case "ignored":
    case "unknown":
    case "import":
    case "page":
    case "counter-style":
    case "moz-document":
    case "nesting":
    case "viewport":
    case "custom-media":
    case "scope":
    case "starting-style":
      return rule;

    case "media":
      rule.value.rules = rule.value.rules.map((nested) =>
        rewriteRule(nested, rewriteBlock),
      );
      return rule;
    case "keyframes":
      rule.value.keyframes = rule.value.keyframes.map((keyframe) => {
        keyframe.declarations =
          rewriteBlock(keyframe.declarations) ?? keyframe.declarations;

        return keyframe;
      });
      return rule;
    case "style":
      rule.value.declarations = rewriteBlock(rule.value.declarations);

      rule.value.rules = rule.value.rules?.flatMap((nested) =>
        rewriteRule(nested, rewriteBlock),
      );

      return rule;
    case "nested-declarations":
      rule.value.declarations = rewriteBlock(rule.value.declarations) ?? {};
      return rule;
    case "supports":
    case "layer-block":
    case "container":
      rule.value.rules = rule.value.rules.flatMap((nested) =>
        rewriteRule(nested, rewriteBlock),
      );
      return rule;
  }
}

function replaceDeclarationBlock(
  block: DeclarationBlock | undefined,
  vars: Map<string, UniqueVarInfo>,
  keptForRuntime: Set<string>,
) {
  if (!block) return;

  block.declarations = replaceDeclarations(
    block.declarations,
    vars,
    keptForRuntime,
  );

  block.importantDeclarations = replaceDeclarations(
    block.importantDeclarations,
    vars,
    keptForRuntime,
  );

  return block;
}

function replaceDeclarations(
  declarations: Declaration[] | undefined,
  vars: Map<string, UniqueVarInfo>,
  keptForRuntime: Set<string>,
): Declaration[] | undefined {
  if (!declarations) return;

  const replacements = declarations.map((declaration) => ({
    declaration,
    substitution: replaceDeclaration(declaration, vars, keptForRuntime),
  }));

  if (replacements.every(({ substitution }) => !substitution)) {
    return declarations;
  }

  // A value written for the property stays unparsed in both passes, so only this pass can tell a substitution beside it apart
  const writtenUnparsed = new Set(
    replacements.flatMap(({ declaration, substitution }) =>
      !substitution && isUnparsedWithoutVar(declaration)
        ? [declaration.value.propertyId.property]
        : [],
    ),
  );

  const markedProperties = new Set<string>();

  const replaced = replacements.flatMap(
    ({ declaration, substitution }): readonly Declaration[] => {
      if (!substitution) {
        return [declaration];
      }

      const property = substitution.value.propertyId.property;

      if (writtenUnparsed.has(property)) {
        return readThroughLibraryVariable(substitution);
      }

      markedProperties.add(property);
      return [substitution];
    },
  );

  return markedProperties.size === 0
    ? replaced
    : [substitutionMarker(markedProperties), ...replaced];
}

function substitutionMarker(properties: ReadonlySet<string>): Declaration {
  return {
    property: "custom",
    value: {
      name: SUBSTITUTED_PROPERTIES,
      value: [...properties].flatMap((property): readonly TokenOrValue[] => [
        { type: "token", value: { type: "ident", value: property } },
        { type: "token", value: { type: "white-space", value: " " } },
      ]),
    },
  };
}

function removeInlinedDeclarations(
  block: DeclarationBlock | undefined,
  vars: Map<string, UniqueVarInfo>,
  keptForRuntime: ReadonlySet<string>,
) {
  if (!block) return;

  const isInlined = (declaration: Declaration) =>
    declaration.property === "custom" &&
    vars.has(declaration.value.name) &&
    !keptForRuntime.has(declaration.value.name);

  block.declarations = block.declarations?.filter(
    (declaration) => !isInlined(declaration),
  );

  block.importantDeclarations = block.importantDeclarations?.filter(
    (declaration) => !isInlined(declaration),
  );

  return block;
}

// Returns the declaration when a var() substituted it into a value with no var() left
function replaceDeclaration(
  declaration: Declaration,
  vars: Map<string, UniqueVarInfo>,
  keptForRuntime: Set<string>,
): UnparsedDeclaration | undefined {
  if (
    declaration.property !== "unparsed" &&
    declaration.property !== "custom"
  ) {
    return;
  }

  const readsVariable = readVariableNames(declaration.value.value).size > 0;

  const value = readsGuaranteedInvalid(declaration.value.value, vars)
    ? undefined
    : declaration.value.value.flatMap((part) =>
        flattenPart(part, vars, keptForRuntime),
      );

  // css-variables-1 §3.1: a declaration a var() leaves without a value is invalid at computed-value time, as if its value were `unset`, and a custom property's is the guaranteed-invalid value
  if (
    value === undefined ||
    (declaration.property === "unparsed" && substitutesNothing(value))
  ) {
    declaration.value.value = [
      keywordToken(declaration.property === "custom" ? "initial" : "unset"),
    ];
    return;
  }

  declaration.value.value = value;

  return readsVariable && isUnparsedWithoutVar(declaration)
    ? declaration
    : undefined;
}

// css-variables-1 §3.1: a value the property cannot take is ignored when written and resets the declaration when a var() substituted it
export function restoreSubstitutionStatus(
  declarations: readonly Declaration[],
): readonly Declaration[] {
  const marker = declarations.find(isSubstitutionMarker);

  if (marker?.property !== "custom") {
    return declarations;
  }

  const markedProperties = new Set(
    marker.value.value.flatMap((part) =>
      part.type === "token" && part.value.type === "ident"
        ? [part.value.value]
        : [],
    ),
  );

  return declarations.flatMap((declaration): readonly Declaration[] => {
    if (declaration === marker) {
      return [];
    }

    return isUnparsedWithoutVar(declaration) &&
      markedProperties.has(declaration.value.propertyId.property)
      ? readThroughLibraryVariable(declaration)
      : [declaration];
  });
}

// The runtime resets a declaration whose var() substitutes a value the property cannot take
function readThroughLibraryVariable(
  declaration: UnparsedDeclaration,
): readonly Declaration[] {
  const name = `${SUBSTITUTION_PREFIX}${declaration.value.propertyId.property}`;

  return [
    { property: "custom", value: { name, value: declaration.value.value } },
    {
      ...declaration,
      value: {
        ...declaration.value,
        value: [{ type: "var", value: { name: { ident: name } } }],
      },
    },
  ];
}

function isSubstitutionMarker(declaration: Declaration): boolean {
  return (
    declaration.property === "custom" &&
    declaration.value.name === SUBSTITUTED_PROPERTIES
  );
}

function isUnparsedWithoutVar(
  declaration: Declaration,
): declaration is UnparsedDeclaration {
  return (
    declaration.property === "unparsed" &&
    readVariableNames(declaration.value.value).size === 0
  );
}

function substitutesNothing(parts: readonly TokenOrValue[]): boolean {
  return parts.every(
    (part) => part.type === "token" && part.value.type === "white-space",
  );
}

function readsGuaranteedInvalid(
  parts: readonly TokenOrValue[],
  vars: Map<string, UniqueVarInfo>,
): boolean {
  return parts.some((part) => {
    if (part.type === "var") {
      const varInfo = vars.get(part.value.name.ident);

      if (varInfo === undefined || varInfo.value !== undefined) {
        return false;
      }

      return part.value.fallback
        ? readsGuaranteedInvalid(part.value.fallback, vars)
        : true;
    } else if (part.type === "function") {
      return readsGuaranteedInvalid(part.value.arguments, vars);
    }

    return false;
  });
}

function keywordToken(keyword: "initial" | "unset"): TokenOrValue {
  return { type: "token", value: { type: "ident", value: keyword } };
}

function flattenPart(
  part: TokenOrValue,
  vars: Map<string, UniqueVarInfo>,
  keptForRuntime: Set<string>,
): TokenOrValue | TokenOrValue[] {
  if (part.type === "var") {
    const name = part.value.name.ident;
    const varInfo = vars.get(name);
    const flattenFallback = () =>
      part.value.fallback?.flatMap((arg) =>
        flattenPart(arg, vars, keptForRuntime),
      );

    if (!varInfo) {
      part.value.fallback = flattenFallback();

      return part;
    } else if (varInfo.value === undefined) {
      return flattenFallback() ?? [];
    } else if (
      part.value.fallback &&
      readVariableNames(varInfo.value).size > 0
    ) {
      // css-variables-1 §3.1: a value that reads a variable only the runtime resolves may yet be the guaranteed-invalid value, which only this var() answers, with its fallback
      keptForRuntime.add(name);
      part.value.fallback = flattenFallback();

      return part;
    }

    return varInfo.value;
  } else if (part.type === "function") {
    part.value.arguments = part.value.arguments.flatMap((arg) => {
      return flattenPart(arg, vars, keptForRuntime);
    });
  }

  return part;
}

function flattenVar(
  name: string,
  vars: Map<string, UniqueVarInfo>,
  keptForRuntime: Set<string>,
  path = new Set<string>(),
) {
  if (path.has(name)) {
    // css-variables-1 §2.3: every variable in a cycle is the guaranteed-invalid value, which the runtime's cycle guard answers
    leaveCycleToRuntime(name, path, vars);
    return;
  }

  const varInfo = vars.get(name);

  if (!varInfo || varInfo.flat) {
    return;
  }

  const parts = varInfo.value;

  // Each variable the value reads is flattened before the value substitutes it, whichever was declared first
  path.add(name);
  for (const readName of readVariableNames(parts)) {
    flattenVar(readName, vars, keptForRuntime, path);
  }
  path.delete(name);

  if (!vars.has(name)) {
    return;
  }

  const keyword = soleCSSWideKeyword(parts)?.keyword;

  if (keyword !== undefined && keyword !== "initial") {
    // The parent's value, which only the runtime knows
    vars.delete(name);
    return;
  }

  // css-variables-1 §2.2, §3.1: `initial`, and a value that reads the guaranteed-invalid value, are the guaranteed-invalid value, which no var() substitutes
  const value =
    keyword === "initial" || readsGuaranteedInvalid(parts, vars)
      ? undefined
      : parts.flatMap((part) => flattenPart(part, vars, keptForRuntime));

  vars.set(name, { count: 1, flat: true, value });
}

function leaveCycleToRuntime(
  reentered: string,
  path: ReadonlySet<string>,
  vars: Map<string, UniqueVarInfo>,
) {
  let inCycle = false;

  for (const name of path) {
    inCycle ||= name === reentered;

    if (inCycle) {
      vars.delete(name);
    }
  }
}

// The names `flattenPart` substitutes: each var(), its fallback's, and those inside a function's arguments
function readVariableNames(
  parts: readonly TokenOrValue[],
  names = new Set<string>(),
): ReadonlySet<string> {
  for (const part of parts) {
    if (part.type === "var") {
      names.add(part.value.name.ident);
      readVariableNames(part.value.fallback ?? [], names);
    } else if (part.type === "function") {
      readVariableNames(part.value.arguments, names);
    }
  }

  return names;
}
