import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";

describe("text-shadow", () => {
  test("<offsetX> <offsetY>", () => {
    registerCSS(
      `.my-class { --my-var: 10px 10px; text-shadow: var(--my-var); }`,
    );

    render(<Text testID={testID} className="my-class" />);

    expect(screen.getByTestId(testID).props.style).toStrictEqual({
      textShadowColor: "black",
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
      textShadowColor: "red",
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
      textShadowColor: "red",
      textShadowOffset: {
        height: 10,
        width: 10,
      },
      textShadowRadius: 0,
    });
  });
});
