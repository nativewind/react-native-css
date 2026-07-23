import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native-css/components/Text";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

describe("hsl", () => {
  test("inline", () => {
    registerCSS(`.my-class { color: hsl(0 84.2% 60.2%); }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("inline with comma", () => {
    registerCSS(`.my-class {
      color: hsl(0, 84.2%, 60.2%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("var with spaces", () => {
    registerCSS(`.my-class {
      --primary: 0 84.2% 60.2%;
      color: hsl(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });

  test("var with comma", () => {
    registerCSS(`.my-class {
        --primary: 0, 84.2%, 60.2%;
        color: hsl(var(--primary));
      }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef4444" },
      testID,
    });
  });
});

describe("hsla", () => {
  test("inline with slash", () => {
    registerCSS(`.my-class {
      color: hsla(0 84.2% 60.2% / 60%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("inline with comma", () => {
    registerCSS(`.my-class {
      color: hsla(0, 84.2%, 60.2%, 60%);
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("function with slash", () => {
    registerCSS(`.my-class {
      --primary: 0 84.2% 60.2% / 60%;
      color: hsla(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });

  test("function with comma", () => {
    registerCSS(`.my-class {
      --primary: 0, 84.2%, 60.2%, 60%;
      color: hsla(var(--primary));
    }`);

    render(<View testID={testID} className="my-class" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#ef444499" },
      testID,
    });
  });
});

describe("currentcolor", () => {
  test("currentcolor and global variables", () => {
    registerCSS(`
      @layer theme {
        :root {
          --color-red-500: red;
        }
      }
      @layer utilities {
        .bg-current {
          background-color: currentcolor;
        }
        .text-red-500 {
          color: var(--color-red-500);
        }
      }
    `);

    render(<View testID={testID} className="bg-current text-red-500" />);
    const component = screen.getByTestId(testID);

    expect(component.type).toBe("View");
    expect(component.props).toStrictEqual({
      children: undefined,
      style: { color: "#f00", backgroundColor: "#f00" },
      testID,
    });
  });
});

describe("inherit", () => {
  test("color: inherit resolves to the parent's color", () => {
    registerCSS(`
      .parent { color: red; }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("text-inherit: a child Text inherits its parent's color", () => {
    // The shape that surfaced the bug: a labelled button whose label renders
    // React Native's default color (black) on native instead of the button's
    // foreground color, while web inherits correctly.
    registerCSS(`
      .button { color: white; }
      .label { color: inherit; }
    `);

    render(
      <View testID="button" className="button">
        <Text testID="label" className="label" />
      </View>,
    );

    expect(screen.getByTestId("label").props.style).toStrictEqual({
      color: "#fff",
    });
  });

  test("inherit chains through an inheriting ancestor without breaking the chain", () => {
    // The middle node inherits and must NOT republish a circular
    // --__rn-css-color, or the grandchild would fail to resolve the color.
    registerCSS(`
      .parent { color: red; }
      .mid { color: inherit; }
      .child { color: inherit; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="mid" className="mid">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("mid").props.style).toStrictEqual({
      color: "#f00",
    });
    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });

  test("inherit follows the nearest colored ancestor", () => {
    registerCSS(`
      .outer { color: red; }
      .inner { color: blue; }
      .child { color: inherit; }
    `);

    render(
      <View className="outer">
        <View className="inner">
          <View testID="child" className="child" />
        </View>
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#00f",
    });
  });

  test("color: unset inherits the parent's color, same as inherit", () => {
    // `unset` computes to `inherit` on inherited properties, and color is one.
    registerCSS(`
      .parent { color: red; }
      .child { color: unset; }
    `);

    render(
      <View testID="parent" className="parent">
        <View testID="child" className="child" />
      </View>,
    );

    expect(screen.getByTestId("child").props.style).toStrictEqual({
      color: "#f00",
    });
  });
});
