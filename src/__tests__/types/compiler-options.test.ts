import ts from "typescript";

import { createProgram, root } from "./_program";

const fixtureName = `${root}/src/__tests__/types/compiler-options.fixture.ts`;

test("inlineVariables.exclude takes a readonly list", () => {
  const program = createProgram([fixtureName], {
    [fixtureName]: [
      `import { compile } from "react-native-css/compiler";`,
      `const preserved = ["--brand", "--accent"] as const;`,
      `compile("", { inlineVariables: { exclude: preserved } });`,
    ].join("\n"),
  });

  expect(
    ts
      .getPreEmitDiagnostics(program, program.getSourceFile(fixtureName))
      .map(({ messageText }) =>
        ts.flattenDiagnosticMessageText(messageText, "\n"),
      ),
  ).toStrictEqual([]);
});
