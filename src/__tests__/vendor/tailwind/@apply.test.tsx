import { screen } from "@testing-library/react-native";
import { View } from "react-native-css/components";

import { render } from "./_tailwind";

const testID = "react-native-css-interop";

test("@apply", async () => {
  await render(<View testID={testID} className="btn-primary" />, {
    extraCss: `
  .btn-primary {
    @apply py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg shadow-md;
  }`,
  });

  const component = screen.getByTestId(testID);

  expect(component).toHaveStyle({
    backgroundColor: "#2b7fff",
    borderRadius: 7,
    color: "#fff",
    fontWeight: 600,
    paddingBlock: 7,
    paddingInline: 14,
    boxShadow: [
      {
        offsetX: 0,
        offsetY: 4,
        blurRadius: 6,
        spreadDistance: -1,
        color: "#0000001a",
      },
      {
        offsetX: 0,
        offsetY: 2,
        blurRadius: 4,
        spreadDistance: -2,
        color: "#0000001a",
      },
    ],
  });
});
