import { join } from "node:path";

import ts from "typescript";

const root = join(__dirname, "../../..").replaceAll("\\", "/");
const fixtureName = `${root}/src/__tests__/types/exact-optional.fixture.tsx`;

// Writes an explicit undefined to each optional member a consumer writes
const fixture = `
import createDebug from "debug";
import type { MetroConfig } from "metro-config";
import {
  Button,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Switch,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { styled } from "react-native-css";
import { compile } from "react-native-css/compiler";
import { compileWithAutoDebug, registerCSS } from "react-native-css/jest";
import { withReactNativeCSS } from "react-native-css/metro";
import type { Config } from "react-native-css/native/react/useNativeCss";
import type { Effect } from "react-native-css/native/reactivity";

declare const maybe: string | undefined;
declare const metroConfig: MetroConfig;

const StyledView = styled(View);
const MappedView = styled(
  View,
  {
    className: {
      target: "style",
      nativeStyleMapping: { color: "accessibilityLabel", backgroundColor: undefined },
    },
    contentClassName: { target: "style", nativeStyleMapping: undefined },
  },
  { passThrough: undefined },
);

export const elements = [
  <View className={maybe} />,
  <Text className={maybe} />,
  <Image source={{}} className={maybe} />,
  <ImageBackground source={{}} imageClassName={maybe} />,
  <Switch className={maybe} />,
  <Button title="" className={maybe} />,
  <TouchableWithoutFeedback className={maybe} />,
  <ScrollView contentContainerClassName={maybe} />,
  <KeyboardAvoidingView contentContainerClassName={maybe} />,
  <FlatList
    data={[]}
    renderItem={() => null}
    columnWrapperClassName={maybe}
    ListHeaderComponentClassName={maybe}
    ListFooterComponentClassName={maybe}
  />,
  <StyledView className={maybe} />,
  <MappedView className={maybe} contentClassName={maybe} />,
];

compile("", {
  filename: undefined,
  projectRoot: undefined,
  inlineRem: undefined,
  inlineVariables: { exclude: undefined },
  selectorPrefix: undefined,
  stylesheetOrder: undefined,
  features: undefined,
  logger: undefined,
  hexColors: undefined,
  colorPrecision: undefined,
});
compile("", { logger: createDebug("test") });
compile("", { logger: (message: string) => void message });

registerCSS("", { debug: undefined });
compileWithAutoDebug("", { debug: undefined });

withReactNativeCSS(metroConfig, {
  typescriptEnvPath: undefined,
  disableTypeScriptGeneration: undefined,
  globalClassNamePolyfill: undefined,
  hexColors: undefined,
  warnings: undefined,
});

export const config: Config = { source: "a", target: "a", nativeStyleMapping: undefined };
export const effect: Effect = {
  observers: new Set(),
  run() {},
  dependencies: undefined,
  snapshots: undefined,
};
`;

test("each optional member a consumer writes accepts an explicit undefined under exactOptionalPropertyTypes", () => {
  const { config } = ts.readConfigFile(`${root}/tsconfig.json`, (path) =>
    ts.sys.readFile(path),
  );
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const compilerOptions = { ...options, exactOptionalPropertyTypes: true };

  const host = ts.createCompilerHost(compilerOptions, true);
  const program = ts.createProgram(
    [`${root}/types.d.ts`, fixtureName],
    compilerOptions,
    {
      ...host,
      fileExists: (name) => name === fixtureName || host.fileExists(name),
      getSourceFile: (name, languageVersion, ...rest) =>
        name === fixtureName
          ? ts.createSourceFile(name, fixture, languageVersion, true)
          : host.getSourceFile(name, languageVersion, ...rest),
    },
  );

  const errors = ts
    .getPreEmitDiagnostics(program, program.getSourceFile(fixtureName))
    .map(({ file, start = 0, messageText }) => {
      const line = file?.getLineAndCharacterOfPosition(start).line ?? -1;
      const message = ts.flattenDiagnosticMessageText(messageText, "\n");
      return `${line + 1}: ${message.split("\n")[0]}`;
    });

  expect(errors).toStrictEqual([]);
});
