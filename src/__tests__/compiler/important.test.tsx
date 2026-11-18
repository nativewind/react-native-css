import { render } from "@testing-library/react-native";
import { compile } from "react-native-css/compiler";
import { Pressable } from "react-native-css/components/Pressable";
import { registerCSS, testID } from "react-native-css/jest";
import { Specificity } from "react-native-css/utilities";

// !important selects which of the runtime's two merge passes a class takes, so a callback style is checked through both

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

  expect(plain.s[Specificity.Important]).toBeUndefined();
  expect(important.s[Specificity.Important]).toBe(1);

  expect(plain.d).toStrictEqual(important.d);
  expect(plain.s[Specificity.ClassName]).toBe(
    important.s[Specificity.ClassName],
  );
});

test("the marker selects the merge pass, and the operand order is how you see it", () => {
  registerCSS(`${PLAIN}\n${IMPORTANT}`);

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
