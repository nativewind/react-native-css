import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { registerCSS, testID } from "react-native-css/jest";

// Chromium 153, Firefox 155 and WebKit 26.6 compute none wherever this is expected
const NO_SHADOW = {
  textShadowColor: "transparent",
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 0,
};

// A second definition keeps --shadow from being inlined, so it resolves at runtime
const decoy = `.decoy { --shadow: 9px 9px green; }`;

test("a later rule's none removes an earlier rule's shadow", () => {
  registerCSS(
    `.shadowed { text-shadow: 1px 1px red; } .plain { text-shadow: none; }`,
  );
  render(<Text testID={testID} className="shadowed plain" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual(NO_SHADOW);
});

test("a later rule's shadow outranks an earlier rule's none", () => {
  registerCSS(
    `.plain { text-shadow: none; } .shadowed { text-shadow: 1px 1px red; }`,
  );
  render(<Text testID={testID} className="shadowed plain" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual({
    textShadowColor: "#f00",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  });
});

test("a shadow written over none leaves the next none drawing nothing", () => {
  registerCSS(
    `.plain { text-shadow: none; } .shadowed { text-shadow: 1px 1px red; }`,
  );
  render(<Text className="shadowed plain" />);
  render(<Text testID={testID} className="plain" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual(NO_SHADOW);
});

test("none on a child outranks its parent's shadow", () => {
  registerCSS(
    `.parent { text-shadow: 1px 1px red; } .child { text-shadow: none; }`,
  );
  render(
    <Text className="parent">
      <Text testID={testID} className="child" />
    </Text>,
  );

  expect(screen.getByTestId(testID).props.style).toStrictEqual(NO_SHADOW);
});

test("a variable holding none removes the shadow at runtime", () => {
  registerCSS(
    `${decoy} .shadowed { text-shadow: 1px 1px red; } .plain { --shadow: none; text-shadow: var(--shadow); }`,
  );
  render(<Text testID={testID} className="shadowed plain" />);

  expect(screen.getByTestId(testID).props.style).toStrictEqual(NO_SHADOW);
});
