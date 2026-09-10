import type { AttributeQuery } from "react-native-css/compiler";

import type { RenderGuard } from "./guards";

export function testAttributes(
  queries: AttributeQuery[],
  props: Record<string, unknown> | undefined | null,
  guards: RenderGuard[],
) {
  return queries.every((query) => testAttribute(query, props, guards));
}

/**
 * INFRA's ASCII whitespace, which §6.1's "whitespace-separated list" links to:
 * TAB, LF, FF, CR and SPACE, and nothing else.
 *
 * `\s` is a different set — it also matches VT, NBSP, the U+2000 block, the line
 * and paragraph separators and the BOM, twenty further code points, none of which
 * separate a word here. Hoisted so the includes-match does not build a RegExp per
 * call on a render path.
 */
const ASCII_WHITESPACE_RUN = /[\t\n\f\r ]+/u;

/**
 * The string an attribute selector compares against, or `undefined` when the
 * attribute is absent.
 *
 * §6 compares attribute VALUES, and a DOM attribute value is always a string. A
 * `dataSet` value is not — a React Native prop carries whatever the author wrote
 * — so the comparison has to coerce. Every operator reads its value through here,
 * so they answer one string rather than each carrying a spelling of its own.
 *
 * `null` and `undefined` answer `undefined` rather than `"null"` / `"undefined"`,
 * because react-native-web omits those keys entirely (`createDOMProps` skips a
 * nullish `dataSet` value), so on the web there is no attribute to compare.
 *
 * React writes an attribute with `"" + value` — ToPrimitive with hint `default` —
 * where this is ToString, so the two disagree for an object carrying `valueOf` or
 * `Symbol.toPrimitive`. Measured, they agree on every other value a prop carries,
 * including `NaN`, `-0`, `1e21`, arrays and `Date`.
 */
function attributeValueText(value: unknown): string | undefined {
  return value?.toString();
}

/**
 * ASCII-range lowercasing, which is what §6.3's `i` flag asks for — "any
 * (ASCII-range) case-permutation".
 *
 * `String.prototype.toLowerCase` applies the full Unicode case mapping, which
 * folds U+212A KELVIN SIGN onto `k` — so a selector written `[att="k" i]` would
 * match a value no browser matches.
 */
function asciiLowerCase(text: string): string {
  return text.replace(/[A-Z]/gu, (letter) => letter.toLowerCase());
}

function testAttribute(
  [type, prop, operator, testValue, caseSensitivity]: AttributeQuery,
  props: Record<string, unknown> | undefined | null,
  guards: RenderGuard[],
) {
  let value: unknown = undefined;

  if (props) {
    if (type === "a") {
      value = props[prop];
    } else {
      const dataSet = props.dataSet as Record<string, unknown> | undefined;
      value = dataSet?.[prop];
    }
  }

  guards.push([type, prop, value]);

  if (!operator) {
    /**
     * §6.1 — `[attr]` matches when the attribute EXISTS, whatever it holds.
     *
     * The two query types answer that differently, because they project onto the
     * DOM differently. A `dataSet` key becomes a `data-*` attribute for every
     * non-nullish value — `false` included, which react-native-web forwards and
     * React writes as `data-x="false"` — so existence is nullish-ness. A plain
     * prop is the boolean-attribute case (`disabled`, `checked`), where `false`
     * means the attribute is not there at all.
     */
    if (type === "d") {
      return value !== undefined && value !== null;
    }
    return value !== undefined && value !== null && value !== false;
  }

  // §6.1's `:not()` arm reads the prop's own falsiness rather than a string, so it
  // is answered before anything coerces. Coercing first would run the conversion on
  // a value this arm never compares — which throws on a null-prototype object, and
  // walks the whole array on the `:empty` query, whose prop is `children`.
  if (operator === "!") {
    return !value;
  }

  /**
   * §6.3 — `i` compares any ASCII-range case permutation of the operand, so both
   * sides are folded once here rather than at each arm below. `s` asks for the
   * default comparison and is never emitted, so an absent flag is the only other
   * state a query can carry.
   */
  const insensitive = caseSensitivity === "i";
  const valueText = attributeValueText(value);
  const attributeText =
    insensitive && valueText !== undefined
      ? asciiLowerCase(valueText)
      : valueText;
  const operand =
    insensitive && testValue !== undefined
      ? asciiLowerCase(testValue)
      : testValue;

  // An absent attribute matches no value selector, whatever the operand — including
  // an absent operand, which `undefined === undefined` would otherwise answer true.
  if (attributeText === undefined || operand === undefined) {
    return false;
  }

  switch (operator) {
    case "=":
      // §6.1 — an exact comparison of two strings. Loose equality is not that:
      // `true == "true"` is `false` (both coerce to numbers, and `Number("true")`
      // is `NaN`), while `false == "0"` and `0 == ""` are both `true`. So the
      // untouched form is wrong in both directions, and the second needs no
      // boolean at all.
      return attributeText === operand;
    case "|=":
      // §6.1 dash-match: the value is EXACTLY `operand`, or begins with `operand`
      // immediately followed by "-". Only the second half was implemented, so
      // `[lang|="en"]` did not match `lang="en"` — the language it names — while
      // matching every subtag of it.
      //
      // This is the one operator §6 gives NO empty-operand exclusion, and the
      // difference is observable: a browser matches `[att|=""]` against `""`,
      // `"-"` and `"-foo"`.
      return (
        attributeText === operand || attributeText.startsWith(operand + "-")
      );
    case "~=":
      // §6.1 includes-match: the value is a whitespace-separated list of words,
      // one of which is exactly `operand`. A newline or a tab separates words
      // exactly as a space does, so splitting on `" "` alone reads a
      // newline-separated pair as one word and finds neither of the two it holds.
      //
      // The emptiness guard is the spec's own two exclusions, and it covers both:
      // an empty operand "will never represent anything", and one containing
      // whitespace cannot be a member of a whitespace-separated list.
      return (
        operand !== "" &&
        attributeText.split(ASCII_WHITESPACE_RUN).includes(operand)
      );
    // §6.2's three substring operators share one exclusion: an empty operand
    // represents nothing.
    case "^=":
      return operand !== "" && attributeText.startsWith(operand);
    case "$=":
      return operand !== "" && attributeText.endsWith(operand);
    case "*=":
      return operand !== "" && attributeText.includes(operand);
    default:
      operator satisfies never;
      return false;
  }
}
