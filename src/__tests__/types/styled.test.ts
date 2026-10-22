import { createLanguageService, root } from "./_program";

const fixtureName = `${root}/src/__tests__/types/styled.fixture.tsx`;

test.each(["false", '"style"'])(
  "a mapping completes React Native's style keys under target %s",
  (target) => {
    const text = [
      `import { View } from "react-native";`,
      `import { styled } from "react-native-css";`,
      `export const mapped = styled(View, { labelClassName: { target: ${target}, nativeStyleMapping: { /*keys*/ } } });`,
    ].join("\n");
    const completions = createLanguageService({
      [fixtureName]: text,
    }).getCompletionsAtPosition(fixtureName, text.indexOf("/*keys*/"), {});

    expect(
      completions?.entries
        .map(({ name }) => name)
        .filter((name) =>
          ["backgroundColor", "color", "tintColor", "fill", "stroke"].includes(
            name,
          ),
        )
        .sort(),
    ).toStrictEqual(["backgroundColor", "color", "tintColor"]);
  },
);
