import { render, screen } from "@testing-library/react-native";
import { View } from "react-native-css/components/View";
import { registerCSS, testID } from "react-native-css/jest";

test("shadow values - single nested variables", () => {
  registerCSS(`
    :root { 
      --color: #fb2c36; 
      --my-var: 0 20px 25px -5px var(--color); 
    }

    .test { box-shadow: var(--my-var); }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        blurRadius: 25,
        color: "#fb2c36",
        offsetX: 0,
        offsetY: 20,
        spreadDistance: -5,
      },
    ],
  });
});

test("shadow values - multiple nested variables", () => {
  registerCSS(`
    :root {
      --my-var: 0 20px 0 0 red, 0 30px 0 0 green;
      --my-var-2: var(--my-var), 0 40px 0 0 purple;
      --my-var-3: 0 50px 0 0 yellow, 0 60px 0 0 orange;
      --my-var-4: var(--my-var-3), 0 70px 0 0 gray;
    }

    .test {
      box-shadow: var(--my-var-2), var(--my-var-4);
    }
  `);

  render(<View testID={testID} className="test" />);
  const component = screen.getByTestId(testID);

  expect(component.props.style).toStrictEqual({
    boxShadow: [
      {
        blurRadius: 0,
        color: "#f00",
        offsetX: 0,
        offsetY: 20,
        spreadDistance: 0,
      },

      {
        blurRadius: 0,
        color: "#008000",
        offsetX: 0,
        offsetY: 30,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#800080",
        offsetX: 0,
        offsetY: 40,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#ff0",
        offsetX: 0,
        offsetY: 50,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#ffa500",
        offsetX: 0,
        offsetY: 60,
        spreadDistance: 0,
      },
      {
        blurRadius: 0,
        color: "#808080",
        offsetX: 0,
        offsetY: 70,
        spreadDistance: 0,
      },
    ],
  });
});
