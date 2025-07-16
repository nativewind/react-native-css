/* eslint-disable */
import type { Selector, SelectorComponent, SelectorList } from "lightningcss";

import { Specificity } from "../runtime/utils/specificity";
import type {
  AttributeQuery,
  AttrSelectorOperator,
  CompilerCollection,
  MediaCondition,
  SpecificityArray,
  StyleRule,
} from "./compiler.types";

export type NormalizeSelector =
  | {
      type: "rootVariables" | "universalVariables";
      subtype: "light" | "dark";
    }
  | {
      type: "className";
      specificity: SpecificityArray;
      classNames: ([string] | [string, Partial<StyleRule>])[];
    };

/**
 * Turns a CSS selector into a `react-native-css` selector.
 */
export function getSelectors(
  extractedStyle: StyleRule,
  selectorList: SelectorList,
  collection: CompilerCollection,
  selectors: NormalizeSelector[] = [],
  mediaQuery: MediaCondition[] = [],
) {
  for (let cssSelector of selectorList) {
    // Ignore `:is()`, and just process its selectors
    if (isIsPseudoClass(cssSelector)) {
      getSelectors(
        extractedStyle,
        cssSelector[0].selectors,
        collection,
        selectors,
      );
    } else if (
      // Matches: :root {}
      isRootVariableSelector(cssSelector)
    ) {
      if (
        // Matches: @media(prefers-dark-mode) { :root {} }
        isDarkModeMediaQuery(extractedStyle.m?.[0])
      ) {
        selectors.push({
          type: "rootVariables",
          subtype: "dark",
        });
      } else {
        selectors.push({
          type: "rootVariables",
          subtype: "light",
        });
      }
    } else if (
      // Matches: .dark:root {} || :root[class~="dark"]
      isRootDarkVariableSelector(cssSelector, collection)
    ) {
      selectors.push({
        type: "rootVariables",
        subtype: "dark",
      });
    } else if (
      // Matches: * {}
      isDefaultVariableSelector(cssSelector)
    ) {
      if (
        // Matches @media(prefers-dark-mode) { * {} }
        isDarkModeMediaQuery(extractedStyle.m?.[0])
      ) {
        selectors.push({
          type: "universalVariables",
          subtype: "dark",
        });
      } else {
        selectors.push({
          type: "universalVariables",
          subtype: "light",
        });
      }
    } else if (
      // Matches:  .dark * {}
      isDarkUniversalSelector(cssSelector, collection)
    ) {
      selectors.push({
        type: "universalVariables",
        subtype: "dark",
      });
    } else if (
      // Matches:  .dark <selector> {}
      isDarkClassLegacySelector(cssSelector, collection)
    ) {
      const [_, __, third, ...rest] = cssSelector;

      getSelectors(extractedStyle, [[third!, ...rest]], collection, selectors, [
        ["=", "prefers-color-scheme", "dark"],
      ]);
    } else if (
      // Matches:  <selector>:is(.dark *) {}
      isDarkClassSelector(cssSelector, collection)
    ) {
      const [first] = cssSelector;

      getSelectors(extractedStyle, [[first!]], collection, selectors, [
        ["=", "prefers-color-scheme", "dark"],
      ]);
    } else {
      const selector = reduceSelector(
        {
          type: "className",
          specificity: [],
          classNames: [],
        },
        cssSelector,
        collection,
        mediaQuery,
      );

      if (selector === null || selector.classNames.length === 0) {
        continue;
      }

      if (selector.type === "className" && mediaQuery.length > 0) {
        const lastClass = selector.classNames[selector.classNames.length - 1]!;
        lastClass[1] ??= {};
        lastClass[1].m ??= [];
        lastClass[1].m.push(...mediaQuery);
      }

      selectors.push(selector);
    }
  }

  return selectors;
}

function reduceSelector(
  acc: Extract<NormalizeSelector, { type: "className" }>,
  selectorComponents: Selector,
  collection: CompilerCollection,
  mediaQuery: MediaCondition[],
) {
  let previousType: SelectorComponent["type"] | undefined;

  /*
   * Loop over each token and the cssSelector and parse it into a `react-native-css` selector
   */
  for (const component of selectorComponents) {
    switch (component.type) {
      case "universal":
      case "namespace":
      case "nesting":
      case "id":
      case "pseudo-element":
        // We don't support these selectors at all
        return null;
      case "attribute": {
        if (acc.classNames.length === 0) {
          if (
            component.name === "dir" &&
            component.operation?.operator === "equal"
          ) {
            mediaQuery ??= [];
            mediaQuery.push(["!!", component.operation.value]);
            break;
          }

          // Ignore any other attributes that are not part of a class selector
          return null;
        }

        // Turn attribute selectors into AttributeConditions
        acc.specificity[Specificity.ClassName] =
          (acc.specificity[Specificity.ClassName] ?? 0) + 1;

        const attributeQuery: AttributeQuery = component.name.startsWith(
          "data-",
        )
          ? ["d", toRNProperty(component.name.replace("data-", ""))]
          : ["a", toRNProperty(component.name)];

        if (component.operation) {
          let operator: AttrSelectorOperator | undefined;

          switch (component.operation.operator) {
            case "equal":
              operator = "=";
              break;
            case "includes":
              operator = "~=";
              break;
            case "dash-match":
              operator = "|=";
              break;
            case "prefix":
              operator = "^=";
              break;
            case "substring":
              operator = "*=";
              break;
            case "suffix":
              operator = "$=";
              break;
            default:
              component.operation.operator satisfies never;
              break;
          }

          if (operator) {
            attributeQuery.push(operator, component.operation.value);
          }
        }

        const lastGroup = acc.classNames[acc.classNames.length - 1]!;
        lastGroup[1] ??= {};
        lastGroup[1].aq ??= [];
        lastGroup[1].aq.push(attributeQuery);
        break;
      }
      case "type": {
        /*
         * We only support type selectors as part of the selector prefix
         * For example: `html .my-class`
         *
         * NOTE: We ignore specificity for this
         */
        if (component.name !== collection.selectorPrefix) {
          return null;
        }
        break;
      }
      case "combinator": {
        // We only support the descendant combinator
        if (component.value !== "descendant") {
          return null;
        }
        break;
      }
      case "class": {
        acc.specificity[Specificity.ClassName] =
          (acc.specificity[Specificity.ClassName] ?? 0) + 1;

        switch (previousType) {
          // <something> .class
          case undefined:
          case "combinator": {
            if (component.name === collection.selectorPrefix?.slice(1)) {
              // If the name matches the selectorPrefix, just ignore it!
              // E.g .dark .myClass
              break;
            }

            acc.classNames.push([component.name]);

            break;
          }
          // .class.otherClass
          case "class": {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].aq ??= [];
            lastGroup[1].aq.push(["a", "className", "*=", component.name]);
            break;
          }
          default: {
            return null;
          }
        }
        break;
      }
      case "pseudo-class": {
        acc.specificity[Specificity.ClassName] =
          (acc.specificity[Specificity.ClassName] ?? 0) + 1;

        if (component.kind === "is") {
          if (isDarkUniversalSelector(component.selectors[0]!, collection)) {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].m ??= [];
            lastGroup[1].m.push(["=", "prefers-color-scheme", "dark"]);
            break;
          }
        }

        switch (component.kind) {
          case "hover": {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].p ??= {};
            lastGroup[1].p.h = 1;
            break;
          }
          case "active": {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].p ??= {};
            lastGroup[1].p.a = 1;
            break;
          }
          case "focus": {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].p ??= {};
            lastGroup[1].p.f = 1;
            break;
          }
          case "disabled": {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].aq ??= [];
            lastGroup[1].aq.push(["a", "disabled"]);
            break;
          }
          case "empty": {
            const lastGroup = acc.classNames[acc.classNames.length - 1]!;
            lastGroup[1] ??= {};
            lastGroup[1].aq ??= [];
            lastGroup[1].aq.push(["a", "children", "!"]);
            break;
          }
        }
      }
    }

    previousType = component.type;
  }

  return acc;
}

function isIsPseudoClass(
  selector: Selector,
): selector is [{ type: "pseudo-class"; kind: "is"; selectors: Selector[] }] {
  return (
    selector.length === 1 &&
    selector[0]?.type === "pseudo-class" &&
    selector[0].kind === "is"
  );
}

function isDarkModeMediaQuery(query?: MediaCondition): boolean {
  if (!query) return false;

  return (
    query[0] === "=" &&
    query[1] === "prefers-color-scheme" &&
    query[2] === "dark"
  );
}

// Matches:  <selector>:is(.dark *)
function isDarkClassSelector(
  [first, second, third]: Selector,
  collection: CompilerCollection,
) {
  if (!collection.darkMode) {
    return false;
  }

  return (
    first &&
    second &&
    !third &&
    first.type === "class" &&
    second.type === "pseudo-class" &&
    second.kind === "is" &&
    second.selectors.length === 1 &&
    second.selectors[0]?.length === 3 &&
    second.selectors[0][0]?.type === "class" &&
    second.selectors[0][0].name === collection.darkMode &&
    second.selectors[0][1]?.type === "combinator" &&
    second.selectors[0][1].value === "descendant" &&
    second.selectors[0][2]?.type === "universal"
  );
}

// Matches:  .dark <selector> {}
function isDarkClassLegacySelector(
  [first, second, third]: Selector,
  collection: CompilerCollection,
) {
  if (!collection.darkMode) {
    return false;
  }

  return (
    first &&
    second &&
    third &&
    first.type === "class" &&
    first.name === collection.darkMode &&
    second.type === "combinator" &&
    second.value === "descendant" &&
    third.type === "class"
  );
}

// Matches:  :root {}
function isRootVariableSelector([first, second]: Selector) {
  return (
    first && !second && first.type === "pseudo-class" && first.kind === "root"
  );
}

// Matches:  * {}
function isDefaultVariableSelector([first, second]: Selector) {
  return first && !second && first.type === "universal";
}

// Matches:  .dark:root  {}
function isRootDarkVariableSelector(
  [first, second]: Selector,
  collection: CompilerCollection,
) {
  if (!collection.darkMode) {
    return false;
  }
  return (
    first &&
    second &&
    // .dark:root {}
    ((first.type === "class" &&
      first.name === collection.darkMode &&
      second.type === "pseudo-class" &&
      second.kind === "root") ||
      // :root[class~=dark] {}
      (first.type === "pseudo-class" &&
        first.kind === "root" &&
        second.type === "attribute" &&
        second.name === "class" &&
        second.operation &&
        second.operation.value === collection.darkMode &&
        ["includes", "equal"].includes(second.operation.operator)))
  );
}

// Matches:  .dark * {}
function isDarkUniversalSelector(
  [first, second, third]: Selector,
  collection: CompilerCollection,
) {
  if (!collection.darkMode) {
    return false;
  }
  return (
    first &&
    second &&
    third &&
    first.type === "class" &&
    first.name === collection.darkMode &&
    second.type === "combinator" &&
    second.value === "descendant" &&
    third.type === "universal"
  );
}

export function toRNProperty<T extends string>(str: T) {
  return str
    .replace(/^-rn-/, "")
    .replace(/-./g, (x) => x[1]!.toUpperCase()) as CamelCase<T>;
}

type CamelCase<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;
