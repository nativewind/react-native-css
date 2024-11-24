/** @jsxImportSource react-native-css */
import { Text, ViewProps } from "react-native";

import {
  fireEvent,
  registerCSS,
  render,
  setupAllComponents,
  testID,
} from "react-native-css/jest";

import { styled } from "../api";

setupAllComponents();

test("inline styles", () => {
  registerCSS(`.red { background-color: red; }`);

  const component = render(
    <Text
      testID={testID}
      className="red"
      style={{ backgroundColor: "blue" }}
    />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({ backgroundColor: "blue" });
});

test("specificity order", () => {
  registerCSS(`.red { color: red; } .blue { color: blue; }`);

  const component = render(
    <Text testID={testID} className="blue red" />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({ color: "#0000ff" });
});

test("specificity modifiers", () => {
  registerCSS(
    `.redOrGreen:hover { color: green; } .redOrGreen { color: red; } .blue { color: blue; }`,
  );

  const component = render(
    <Text testID={testID} className="blue redOrGreen " />,
  ).getByTestId(testID);

  expect(component).toHaveStyle(
    { color: "#0000ff" }, // .blue
  );

  fireEvent(component, "hoverIn");

  expect(component).toHaveStyle({ color: "#008000" }); // Green
});

test("important - no wrapper", () => {
  registerCSS(`
    .red { color: red; }
    .blue { color: blue !important; }
  `);

  const component = render(
    <Text testID={testID} className="blue red" />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({ color: "#0000ff" });
});

test("important - inline", () => {
  registerCSS(`
    .blue { background-color: blue !important; }
  `);

  const component = render(
    <Text
      testID={testID}
      className="blue"
      style={{ backgroundColor: "red" }}
    />,
  ).getByTestId(testID);

  expect(component).toHaveStyle({ backgroundColor: "#0000ff" });
});

test("important - modifiers", () => {
  registerCSS(`
    .red { color: red; }
    .red:hover { color: green; }
    .blue { color: blue !important; }
  `);

  const component = render(
    <Text testID={testID} className="blue red" />,
  ).getByTestId(testID);

  expect(component).toHaveStyle(
    { color: "#0000ff" }, // Blue
  );

  fireEvent(component, "hoverIn");

  expect(component).toHaveStyle(
    { color: "#0000ff" }, // Blue
  );
});

test("passThrough - inline", () => {
  registerCSS(`
    .red { color: red; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return <Text {...props} style={[{ color: "black" }, style]} />;
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Black wins because it is inline
  expect(component).toHaveStyle({ color: "black" });
});

test("passThrough - inline reversed", () => {
  registerCSS(`
    .red { color: red; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return <Text {...props} style={[style, { color: "black" }]} />;
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Black wins because it is inline
  expect(component).toHaveStyle({ color: "black" });
});

test("passThrough - inline important", () => {
  registerCSS(`
    .red { color: red !important; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return <Text {...props} style={[style, { color: "black" }]} />;
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Red wins because it is important and overrides the inline style
  expect(component).toHaveStyle({ color: "#ff0000" });
});

test("passThrough - inline important existing", () => {
  registerCSS(`
    .red { color: red !important; }
    .blue { color: blue !important; }
  `);

  const MyText = styled(
    ({ style, ...props }: ViewProps) => {
      return (
        <Text {...props} className="blue" style={[style, { color: "black" }]} />
      );
    },
    { className: "style" },
    { passThrough: true },
  );

  const component = render(
    <MyText testID={testID} className="red" />,
  ).getByTestId(testID);

  // Blue wins, because 'red' and 'blue' are both important, but 'blue' has a higher 'order'
  expect(component).toHaveStyle({ color: "#0000ff" });
});
