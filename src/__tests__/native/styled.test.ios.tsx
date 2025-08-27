import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";

const children = undefined;

test.skip("static styles w/ only target", () => {
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

test.skip("static styles w/ target & nativeStyleMapping", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
      background-color: red;
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

test.skip("static styles w/ target none", () => {
  registerCSS(`
    .text-blue-500 {
      color: blue;
      background-color: red;
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

test.skip("dynamic styles w/ target & nativeStyleToProp", () => {
  registerCSS(`
    .text-blue-500 {
      --blue: blue;
      --red: red;
      color: var(--blue);
      background-color: var(--red);
    }
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
