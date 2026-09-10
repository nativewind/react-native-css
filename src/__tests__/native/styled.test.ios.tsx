import { View } from "react-native";

import { render, screen } from "@testing-library/react-native";
import { registerCSS, testID } from "react-native-css/jest";
import { styled } from "react-native-css/runtime";

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
      color: "#00f",
    },
  });
});

test("static styles w/ target & nativeStyleMapping", () => {
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
    myColor: "#00f",
    other: {
      backgroundColor: "#f00",
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
    myColor: "#00f",
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
    myColor: "#00f",
    other: {
      backgroundColor: "#f00",
    },
  });
});

// Both spellings are part of the declared API during migration.
test.each(["nativeStyleMapping", "nativeStyleToProp"] as const)(
  "%s updates, removes, and restores mapped values without discarding inline styles",
  (option) => {
    registerCSS(`.first { color: blue; background-color: red; }
      .second { color: green; background-color: red; }`);
    const StyledView = styled(View, {
      className: { target: false, [option]: { color: "accessibilityLabel" } },
    });
    render(<StyledView testID={testID} style={{ opacity: 0.4 }} />);
    for (const [className, expected] of [
      ["first", "#00f"],
      ["second", "#008000"],
      ["", undefined],
      ["first", "#00f"],
    ] as const) {
      const element = (
        <StyledView
          testID={testID}
          className={className}
          style={{ opacity: 0.4 }}
        />
      );
      screen.rerender(element);
      expect(screen.getByTestId(testID).props.accessibilityLabel).toBe(
        expected,
      );
      expect(screen.getByTestId(testID).props.style).toEqual({ opacity: 0.4 });
    }
  },
);

test.each([false, true])(
  "current mapping wins over deprecated alias (empty: %s)",
  (empty) => {
    registerCSS(`.subject { color: blue; }`);
    const StyledView = styled(View, {
      className: {
        target: "style",
        nativeStyleMapping: empty ? {} : { color: "accessibilityLabel" },
        nativeStyleToProp: { color: "testID" },
      },
    });
    render(<StyledView testID={testID} className="subject" />);
    const props = screen.getByTestId(testID).props;
    expect(props.accessibilityLabel).toBe(empty ? undefined : "#00f");
    if (empty) expect(props.style).toEqual({ color: "#00f" });
  },
);
