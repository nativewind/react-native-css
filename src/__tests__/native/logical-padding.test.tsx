import { render, screen } from "@testing-library/react-native";
import { TextInput } from "react-native-css/components/TextInput";
import { registerCSS, testID } from "react-native-css/jest";

// Android's TextInput keeps its theme padding unless it sees padding,
// paddingVertical/paddingHorizontal or a physical side, so a one-value
// padding-block/padding-inline must not reach it as paddingBlock/paddingInline.
describe.each([
  ["folded", {}],
  ["kept", { inlineVariables: false }],
] as const)("variables %s", (_, options) => {
  test.each([
    ["padding-block: 8px", { paddingVertical: 8 }],
    ["padding-inline: 16px", { paddingHorizontal: 16 }],
    ["--s: 6px; padding-block: var(--s)", { paddingVertical: 6 }],
    ["--s: 6px; padding-inline: calc(var(--s) * 2)", { paddingHorizontal: 12 }],
    ["padding-block: 1px 2px", { paddingBlockStart: 1, paddingBlockEnd: 2 }],
  ])("%s", (body, expected) => {
    registerCSS(`.a { ${body} }`, options);
    render(<TextInput testID={testID} className="a" />);
    expect(screen.getByTestId(testID).props.style).toStrictEqual(expected);
  });
});
