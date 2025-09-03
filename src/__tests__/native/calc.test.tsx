import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("calc(10px + 100px)", () => {
  registerCSS(
    `.my-class {
        width: calc(10px + 100px);
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      width: 110,
    },
    testID,
  });
});

test("calc(100% - 30px)", () => {
  registerCSS(
    `.my-class {
        width: calc(100% - 30px);
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  // React Native does not support calc() with a percentage value, so there should be no style
  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    testID,
  });
});

test("calc(2em * 3)", () => {
  registerCSS(
    `.my-class {
        width: calc(2em * 2);
        font-size: 5px
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      width: 20,
      fontSize: 5,
    },
    testID,
  });
});

test("calc(2rem * 5)", () => {
  registerCSS(
    `.my-class {
        width: calc(2rem * 5)
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      width: 140,
    },
    testID,
  });
});

test("calc(var(--variable) + 20px)", () => {
  registerCSS(
    `.my-class {
        --my-var: 100px;
        width: calc(var(--my-var) + 20px)
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      width: 120,
    },
    testID,
  });
});

test("calc(var(--percent) + 20%)", () => {
  registerCSS(
    `.my-class {
          --percent: 10%;
        width: calc(var(--percent) + 20%)
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      width: "30%",
    },
    testID,
  });
});

test("calc(var(--variable) + 20%)", () => {
  // React Native does not support calc() with a percentage value and a non-percentage unit, so this should be `undefined`
  registerCSS(
    `.my-class {
         --variable: 100px;
        width: calc(var(--variable) + 20%)
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    testID,
  });
});

test("calc(var(--percent) + 20px)", () => {
  // React Native does not support calc() with a percentage value and a non-percentage unit, so this should be `undefined`
  registerCSS(
    `.my-class {
        --percent: 10%;
        width: calc(var(--percent) + 20px)
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    testID,
  });
});

test("calc & colors", () => {
  registerCSS(
    `.my-class {
        --H: 100;
        --S: 100%;
        --L: 50%;
        background-color: hsl(
          calc(var(--H) + 20),
          calc(var(--S) - 10%),
          calc(var(--L) + 30%)
        )
      }`,
  );

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props).toStrictEqual({
    children: undefined,
    style: {
      backgroundColor: "#9efa9e",
    },
    testID,
  });
});

test("infinity", () => {
  registerCSS(`.my-class {
    border-radius: calc(infinity * 1px);
  }`);

  render(<View testID={testID} className="my-class" />);
  const component = screen.getByTestId(testID);

  expect(component.type).toBe("View");
  expect(component.props.style).toStrictEqual({
    borderRadius: 9007199254740990,
  });
});
