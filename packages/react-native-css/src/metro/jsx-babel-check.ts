import { loadPartialConfig } from "@babel/core";

import { type ErrorMessages } from "./errors";

export function checkJSXSetup(presetName: string, errors: ErrorMessages) {
  // Load the Babel configuration automatically
  const partialConfig = loadPartialConfig();

  if (!partialConfig?.hasFilesystemConfig() || !partialConfig.options.presets) {
    throw new Error(errors.jsxBabelConfigMissing);
  }

  const hasPreset = partialConfig.options.presets.find((preset) => {
    return (
      typeof preset === "object" &&
      "file" in preset &&
      preset.file &&
      preset.file.request === presetName
    );
  });

  if (!hasPreset) {
    throw new Error(errors.jsxBabelPresetMissing);
  }
}
