/* eslint-disable */
import type { Selector, SelectorList } from "lightningcss";

import { Specificity } from "../utilities";
import type {
  AttributeQuery,
  AttrSelectorOperator,
  CompilerOptions,
  ContainerQuery,
  MediaCondition,
  PseudoClassesQuery,
  SpecificityArray,
} from "./compiler.types";
import { StylesheetBuilder } from "./stylesheet";

export type NormalizeSelector =
  | ClassNameSelector
  | {
      type: "rootVariables" | "universalVariables";
      subtype: "light" | "dark";
    };

type ClassNameSelector = {
  type: "className";
  specificity: SpecificityArray;
  className: string;
  mediaQuery?: MediaCondition[];
  containerQuery?: ContainerQuery[];
  pseudoClassesQuery?: PseudoClassesQuery;
  attributeQuery?: AttributeQuery[];
};

/**
 * Turns a CSS selector into a `react-native-css` selector.
 */
export function getSelectors(
  selectorList: SelectorList,
  isDarkMode: boolean,
  builder: StylesheetBuilder,
  selectors: NormalizeSelector[] = [],
) {
  for (let cssSelector of selectorList) {
    // Ignore `:is()` & `:where()`, and just process its selectors
    if (isIsPseudoClass(cssSelector) || isWherePseudoClass(cssSelector)) {
      getSelectors(cssSelector[0].selectors, isDarkMode, builder, selectors);
    } else if (
      // Matches: :root {}
      isRootVariableSelector(cssSelector)
    ) {
      // Matches: @media(prefers-dark-mode) { :root {} }
      if (isDarkMode) {
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
      isRootDarkVariableSelector(cssSelector)
    ) {
      selectors.push({
        type: "rootVariables",
        subtype: "dark",
      });
    } else if (
      // Matches @media(prefers-dark-mode) { * {} }
      isDarkMode &&
      isDefaultVariableSelector(cssSelector)
    ) {
      selectors.push({
        type: "universalVariables",
        subtype: "dark",
      });
    } else if (
      // Matches: * {}
      isDefaultVariableSelector(cssSelector)
    ) {
      selectors.push({
        type: "universalVariables",
        subtype: "light",
      });
      // } else if (
      //   // Matches:  .dark * {}
      //   isDarkUniversalSelector(cssSelector)
      // ) {
      //   selectors.push({
      //     type: "universalVariables",
      //     subtype: "dark",
      //   });
      // } else if (
      //   // Matches:  .dark <selector> {}
      //   isDarkClassLegacySelector(cssSelector, collection)
      // ) {
      //   const [_, __, third, ...rest] = cssSelector;

      //   getSelectors(extractedStyle, [[third!, ...rest]], collection, selectors, [
      //     ["=", "prefers-color-scheme", "dark"],
      //   ]);
      // } else if (
      //   // Matches:  <selector>:is(.dark *) {}
      //   isDarkClassSelector(cssSelector, collection)
      // ) {
      //   const [first] = cssSelector;

      //   getSelectors(extractedStyle, [[first!]], collection, selectors, [
      //     ["=", "prefers-color-scheme", "dark"],
      //   ]);
    } else {
      const selector = classNameSelector(cssSelector, builder.getOptions());

      if (selector === null) {
        continue;
      }

      selectors.push(selector);
    }
  }

  return selectors;
}

function classNameSelector(
  selector: Selector,
  options: CompilerOptions,
): ClassNameSelector | null {
  let primaryClassName: string | undefined;
  const specificity: SpecificityArray = [];
  let mediaQuery: MediaCondition[] | undefined;
  let containerQuery: ContainerQuery[] | undefined;
  let attributeQuery: AttributeQuery[] | undefined;
  let pseudoClassesQuery: PseudoClassesQuery | undefined;

  let currentContainerQuery: ContainerQuery | undefined;

  let isInClassBlock = false;
  let newBlock = false;

  function getAttributeQuery() {
    if (newBlock) {
      currentContainerQuery ??= {};
    }

    if (currentContainerQuery) {
      if (!currentContainerQuery.a) {
        currentContainerQuery.a = [];
      }
      return currentContainerQuery.a;
    } else {
      attributeQuery ??= [];
      return attributeQuery;
    }
  }

  function getPseudoClassesQuery() {
    if (newBlock) {
      currentContainerQuery ??= {};
    }

    if (currentContainerQuery) {
      if (!currentContainerQuery.p) {
        currentContainerQuery.p = {};
      }
      return currentContainerQuery.p;
    } else {
      pseudoClassesQuery ??= {};
      return pseudoClassesQuery;
    }
  }

  /*
   * Loop over each token in reverse order.
   */
  for (const component of selector.reverse()) {
    switch (component.type) {
      case "universal":
      case "namespace":
      case "id":
      case "pseudo-element":
        // We don't support these selectors at all
        return null;
      case "nesting":
        continue;
      case "class": {
        if (!primaryClassName) {
          primaryClassName = component.name;
        } else if (isInClassBlock) {
          getAttributeQuery().unshift(["a", "className", "*=", component.name]);
        } else if (component.name !== options.selectorPrefix) {
          if (currentContainerQuery?.n) {
            getAttributeQuery().unshift([
              "a",
              "className",
              "*=",
              component.name,
            ]);
          } else {
            currentContainerQuery ??= {};
            currentContainerQuery.n = component.name;

            containerQuery ??= [];
            containerQuery.unshift(currentContainerQuery);
          }
        }

        isInClassBlock = true;
        newBlock = false;

        specificity[Specificity.ClassName] =
          (specificity[Specificity.ClassName] ?? 0) + 1;

        break;
      }
      case "pseudo-class": {
        specificity[Specificity.ClassName] =
          (specificity[Specificity.ClassName] ?? 0) + 1;

        // if (component.kind === "is") {
        //   if (isDarkUniversalSelector(component.selectors[0]!, collection)) {
        //     const lastGroup = acc.classNames[acc.classNames.length - 1]!;
        //     lastGroup[1] ??= {};
        //     lastGroup[1].m ??= [];
        //     lastGroup[1].m.push(["=", "prefers-color-scheme", "dark"]);
        //     break;
        //   }
        // }

        switch (component.kind) {
          case "hover": {
            getPseudoClassesQuery().h = 1;
            break;
          }
          case "active": {
            getPseudoClassesQuery().a = 1;
            break;
          }
          case "focus": {
            getPseudoClassesQuery().f = 1;
            break;
          }
          case "disabled": {
            getAttributeQuery().push(["a", "disabled"]);
            break;
          }
          case "empty": {
            getAttributeQuery().push(["a", "children", "!"]);
            break;
          }
          default: {
            // We don't support other pseudo-classes
            return null;
          }
        }
        break;
      }
      case "attribute": {
        // We don't support attribute selectors as standalone selectors
        // Except for a top level [dir] selector
        // if (classNames.length === 0) {
        //   if (
        //     component.name === "dir" &&
        //     component.operation?.operator === "equal"
        //   ) {
        //     mediaQuery ??= [];
        //     mediaQuery.push(["!!", component.operation.value]);
        //     break;
        //   }

        //   // Ignore any other attributes that are not part of a class selector
        //   return null;
        // }

        // Turn attribute selectors into AttributeConditions
        specificity[Specificity.ClassName] =
          (specificity[Specificity.ClassName] ?? 0) + 1;

        // [data-*] are turned into `dataSet` queries
        // Everything else is turned into `attribute` queries
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

        getAttributeQuery().push(attributeQuery);
        break;
      }
      case "type": {
        /*
         * We only support type selectors as part of the selector prefix
         * For example: `html .my-class`
         *
         * NOTE: We ignore specificity for this
         */
        if (component.name === options.selectorPrefix) {
          break;
        }
        return null;
      }
      case "combinator": {
        // We only support the descendant combinator
        if (component.value === "descendant") {
          isInClassBlock = false;
          newBlock = true;
          currentContainerQuery = undefined;
          break;
        }

        return null;
      }
    }
  }

  if (!primaryClassName) {
    // No class name found, return null
    return null;
  }

  return {
    type: "className",
    specificity: specificity,
    className: primaryClassName,
    mediaQuery,
    containerQuery,
    pseudoClassesQuery,
    attributeQuery,
  };
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

function isWherePseudoClass(
  selector: Selector,
): selector is [
  { type: "pseudo-class"; kind: "where"; selectors: Selector[] },
] {
  return (
    selector.length === 1 &&
    selector[0]?.type === "pseudo-class" &&
    selector[0].kind === "where"
  );
}

// function isDarkModeMediaQuery(query?: MediaCondition): boolean {
//   if (!query) return false;

//   return (
//     query[0] === "=" &&
//     query[1] === "prefers-color-scheme" &&
//     query[2] === "dark"
//   );
// }

// Matches:  <selector>:is(.dark *)
// function isDarkClassSelector(
//   [first, second, third]: Selector,
//   collection: CompilerCollection,
// ) {
//   if (!collection.darkMode) {
//     return false;
//   }

//   return (
//     first &&
//     second &&
//     !third &&
//     first.type === "class" &&
//     second.type === "pseudo-class" &&
//     second.kind === "is" &&
//     second.selectors.length === 1 &&
//     second.selectors[0]?.length === 3 &&
//     second.selectors[0][0]?.type === "class" &&
//     second.selectors[0][0].name === collection.darkMode &&
//     second.selectors[0][1]?.type === "combinator" &&
//     second.selectors[0][1].value === "descendant" &&
//     second.selectors[0][2]?.type === "universal"
//   );
// }

// Matches:  .dark <selector> {}
// function isDarkClassLegacySelector(
//   [first, second, third]: Selector,
//   collection: CompilerCollection,
// ) {
//   if (!collection.darkMode) {
//     return false;
//   }

//   return (
//     first &&
//     second &&
//     third &&
//     first.type === "class" &&
//     first.name === collection.darkMode &&
//     second.type === "combinator" &&
//     second.value === "descendant" &&
//     third.type === "class"
//   );
// }

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
function isRootDarkVariableSelector([first, second]: Selector) {
  return (
    first &&
    second &&
    // .dark:root {}
    ((first.type === "class" &&
      second.type === "pseudo-class" &&
      second.kind === "root") ||
      // :root[class~=dark] {}
      (first.type === "pseudo-class" &&
        first.kind === "root" &&
        second.type === "attribute" &&
        second.name === "class" &&
        second.operation &&
        ["includes", "equal"].includes(second.operation.operator)))
  );
}

// Matches:  .dark * {}
// function isDarkUniversalSelector(
//   [first, second, third]: Selector,
//   collection: CompilerCollection,
// ) {
//   if (!collection.darkMode) {
//     return false;
//   }
//   return (
//     first &&
//     second &&
//     third &&
//     first.type === "class" &&
//     first.name === collection.darkMode &&
//     second.type === "combinator" &&
//     second.value === "descendant" &&
//     third.type === "universal"
//   );
// }

export function toRNProperty<T extends string>(str: T) {
  return str
    .replace(/^-rn-/, "")
    .replace(/-./g, (x) => x[1]!.toUpperCase()) as CamelCase<T>;
}

type CamelCase<S extends string> =
  S extends `${infer P1}-${infer P2}${infer P3}`
    ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
    : Lowercase<S>;
