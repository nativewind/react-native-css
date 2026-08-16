import { render } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { Pressable } from "react-native-css/components/Pressable";
import { registerCSS, testID } from "react-native-css/jest";
import { Specificity } from "react-native-css/utilities";

/**
 * `!important` is decided in the compiler and carried in the rule's specificity array,
 * and the runtime reads that slot to choose which of its two merge passes a class takes.
 * That makes the marker the compiler-plane half of a runtime defect: a `style` callback
 * merged as data stops being a callback, and the two passes are separate code paths, so
 * a guard on one says nothing about the other. The tests below pin the marker, then pin
 * that a callback survives whichever pass the marker selects.
 */

const PLAIN = `.bg-red { background-color: red; }`;
const IMPORTANT = `.bg-red\\! { background-color: red !important; }`;

function ruleFor(css: string) {
  const rule = compile(css).stylesheet().s?.[0]?.[1]?.[0];

  if (rule === undefined) {
    throw new Error(`compiled no rule for ${css}`);
  }

  return rule;
}

test("!important sets the Important slot, and nothing else moves", () => {
  const plain = ruleFor(PLAIN);
  const important = ruleFor(IMPORTANT);

  // Read through the exported census rather than the literal index — the slot is
  // named `Specificity.Important`, and a reshuffle of that enum has to move this
  // assertion with it rather than leave it pointing at a neighbour.
  expect(plain.s[Specificity.Important]).toBeUndefined();
  expect(important.s[Specificity.Important]).toBe(1);

  // The declaration itself is untouched: the marker is the only difference, which
  // is what makes it the thing that selects the route.
  expect(plain.d).toStrictEqual(important.d);
  expect(plain.s[Specificity.ClassName]).toBe(
    important.s[Specificity.ClassName],
  );
});

test("the marker selects the merge pass, and the operand order is how you see it", () => {
  registerCSS(`${PLAIN}\n${IMPORTANT}`);

  // Without the marker the class merges as the inline pass: the class value goes
  // first and the callback's result second, so the callback wins on a conflict.
  expect(
    render(
      <Pressable
        testID={testID}
        className="bg-red"
        style={() => ({ backgroundColor: "blue" })}
      />,
    ).getByTestId(testID).props.style,
  ).toStrictEqual([{ backgroundColor: "#f00" }, { backgroundColor: "blue" }]);

  // Reversed with the marker: the important declaration is rightmost and wins.
  expect(
    render(
      <Pressable
        testID={testID}
        className="bg-red!"
        style={() => ({ backgroundColor: "blue" })}
      />,
    ).getByTestId(testID).props.style,
  ).toStrictEqual([{ backgroundColor: "blue" }, { backgroundColor: "#f00" }]);
});

test("the callback ran on both routes rather than reaching the view unevaluated", () => {
  registerCSS(`${PLAIN}\n${IMPORTANT}`);

  // `Pressable` picks its branch with `typeof style === "function"`. Merged into an
  // array the answer is "object", the callback never runs, and the raw function
  // reaches the native view — the entry below would be `[Function style]` instead of
  // the object it returned, and every pressed-state style would be silently gone.
  for (const className of ["bg-red", "bg-red!"]) {
    const style = render(
      <Pressable
        testID={testID}
        className={className}
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
      />,
    ).getByTestId(testID).props.style as unknown[];

    expect(style).toContainEqual({ opacity: 1 });

    for (const entry of style) {
      expect(typeof entry).not.toBe("function");
    }
  }
});
