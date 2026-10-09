import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS } from "react-native-css/jest";

const RED = { color: "#f00" };

/** Any rule declaring a container makes its element the default container a nameless query resolves against. */
const CONTAINER_CSS = `.container { container-type: inline-size; }`;

test("a rule scoped to a hovered ancestor does not apply under an ancestor that is not hovered", () => {
  registerCSS(`
    ${CONTAINER_CSS}
    :hover .subject { color: red; }
  `);

  render(
    <View testID="container" className="container">
      <View testID="subject" className="subject" />
    </View>,
  );

  expect(screen.getByTestId("subject")).not.toHaveStyle(RED);

  fireEvent(screen.getByTestId("container"), "hoverIn");

  expect(screen.getByTestId("subject")).toHaveStyle(RED);
});

test("the same rule does not apply where there is no ancestor to answer it", () => {
  registerCSS(`:hover .subject { color: red; }`);

  render(<View testID="subject" className="subject" />);

  expect(screen.getByTestId("subject").props.style).toStrictEqual(undefined);
});

test("an ancestor condition is withheld from a sibling of the subject's ancestor", () => {
  registerCSS(`
    ${CONTAINER_CSS}
    :active .subject { color: red; }
  `);

  render(
    <>
      <View testID="pressed" className="container">
        <View testID="under-pressed" className="subject" />
      </View>
      <View testID="idle" className="container">
        <View testID="under-idle" className="subject" />
      </View>
    </>,
  );

  fireEvent(screen.getByTestId("pressed"), "pressIn");

  expect(screen.getByTestId("under-pressed")).toHaveStyle(RED);
  expect(screen.getByTestId("under-idle")).not.toHaveStyle(RED);
});

test("an attribute-identified ancestor is withheld where no ancestor can answer it", () => {
  registerCSS(`[data-state="on"] .subject { color: red; }`);

  render(
    <View>
      <View testID="subject" className="subject" />
    </View>,
  );

  expect(screen.getByTestId("subject").props.style).toStrictEqual(undefined);
});

test("a named ancestor still answers from the element its class names", () => {
  registerCSS(`.group:hover .subject { color: red; }`);

  render(
    <View testID="group" className="group">
      <View testID="subject" className="subject" />
    </View>,
  );

  expect(screen.getByTestId("subject")).not.toHaveStyle(RED);

  fireEvent(screen.getByTestId("group"), "hoverIn");

  expect(screen.getByTestId("subject")).toHaveStyle(RED);
});

test("the ancestor itself is not a subject, even when it carries the class", () => {
  registerCSS(`
    ${CONTAINER_CSS}
    :hover .subject { color: red; }
  `);

  render(
    <View testID="container" className="container subject">
      <View testID="descendant" className="subject" />
    </View>,
  );

  fireEvent(screen.getByTestId("container"), "hoverIn");

  expect(screen.getByTestId("descendant")).toHaveStyle(RED);
  expect(screen.getByTestId("container")).not.toHaveStyle(RED);
});

test("a hovered ancestor moves every subject beneath it, and only those", () => {
  registerCSS(`
    ${CONTAINER_CSS}
    :hover .subject { color: red; }
  `);

  render(
    <>
      <View testID="container" className="container">
        <View testID="direct" className="subject" />
        <View>
          <View testID="nested" className="subject" />
        </View>
      </View>
      <View testID="outside" className="subject" />
    </>,
  );

  fireEvent(screen.getByTestId("container"), "hoverIn");

  expect(screen.getByTestId("direct")).toHaveStyle(RED);
  expect(screen.getByTestId("nested")).toHaveStyle(RED);
  expect(screen.getByTestId("outside")).not.toHaveStyle(RED);
});
