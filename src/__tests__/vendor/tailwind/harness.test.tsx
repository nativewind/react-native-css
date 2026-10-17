import { View } from "react-native-css/components";

import { render } from "./_tailwind";

async function compileClassName(className: string) {
  const { stylesheet } = await render(<View className={className} />);
  return stylesheet().s?.map(([name]) => name);
}

test("renders that read the same millisecond compile their own classes", async () => {
  const now = jest.spyOn(Date, "now").mockReturnValue(0);

  try {
    expect(await compileClassName("text-red-500")).toEqual(["text-red-500"]);
    expect(await compileClassName("text-blue-500")).toEqual(["text-blue-500"]);
  } finally {
    now.mockRestore();
  }
});
