import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";

describe("text-shadow", () => {
  test("<offsetX> <offsetY>", () => {
    registerCSS(
      `.my-class {
        --my-var: 10px 10px;
        text-shadow: var(--my-var);
      }`,
    );

    render(<Text testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      textShadowColor: {
        semantic: ["label", "labelColor"],
      },
      textShadowOffset: {
        height: 10,
        width: 10,
      },
      textShadowRadius: 0,
    });
  });

  test("<color> <offsetX> <offsetY>", () => {
    registerCSS(
      `.my-class { --my-var: 10px 10px; text-shadow: red var(--my-var); }`,
    );

    render(<Text testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      textShadowColor: "#f00",
      textShadowOffset: {
        height: 10,
        width: 10,
      },
      textShadowRadius: 0,
    });
  });

  test("<offsetX> <offsetY> <color>", () => {
    registerCSS(
      `.my-class { --my-var: 10px 10px; text-shadow: var(--my-var) red; }`,
    );

    render(<Text testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      textShadowColor: "#f00",
      textShadowOffset: {
        height: 10,
        width: 10,
      },
      textShadowRadius: 0,
    });
  });
});

describe("text-shadow from runtime variables", () => {
  test("single shadow", () => {
    registerCSS(
      `.my-class {
        --my-shadow: 1px 1px 2px #000;
        text-shadow: var(--my-shadow);
      }`,
      { inlineVariables: false },
    );

    render(<Text testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      textShadowColor: "#000",
      textShadowOffset: { height: 1, width: 1 },
      textShadowRadius: 2,
    });
  });
});
