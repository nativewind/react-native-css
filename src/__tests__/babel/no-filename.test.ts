import { transformSync } from "@babel/core";

import plugin from "../../babel/import-plugin";

test("a file transformed without a filename is left as written", () => {
  const source = `import { View } from "react-native";`;

  const output = transformSync(source, {
    configFile: false,
    babelrc: false,
    plugins: [plugin],
  })?.code;

  expect(output).toBe(source);
});
