/** @jsxImportSource react-native-css */
import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";

import { styled } from "../api";

const children = undefined;

test("static styles w/ only target", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
    }
  `);

  const StyleView = styled(View, {
    className: "style",
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    style: {
      color: "#0000ff",
    },
  });
});

test("static styles w/ target & nativeStyleToProp", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
      background-color: red;
    }
  `);

  const StyleView = styled(View as any, {
    className: {
      target: "other",
      nativeStyleToProp: {
        color: "myColor",
      },
    },
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    myColor: "#0000ff",
    other: {
      backgroundColor: "#ff0000",
    },
  });
});

test("static styles w/ target none", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
      background-color: red;
    }
  `);

  const StyleView = styled(View as any, {
    className: {
      target: false,
      nativeStyleToProp: {
        color: "myColor",
      },
    },
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    myColor: "#0000ff",
  });
});

test("dynamic styles w/ target & nativeStyleToProp", () => {
  registerCSS(`
    .text-blue-500 {
      --blue: blue;
      --red: red;
      color: var(--blue);
      background-color: var(--red);
    }
  `);

  const StyleView = styled(View as any, {
    className: {
      target: "other",
      nativeStyleToProp: {
        color: "myColor",
      },
    },
  });

  render(
    <StyleView testID={testID} className="text-blue-500 hover:text-red-500" />,
  );
  const component = screen.getByTestId(testID);

  expect(component.props).toStrictEqual({
    testID,
    children,
    myColor: "blue",
    other: {
      backgroundColor: "red",
    },
  });
});
