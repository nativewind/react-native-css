/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const jestExpo = require("jest-expo/jest-preset");

module.exports = {
  ...jestExpo,
  testPathIgnorePatterns: ["dist/"],
};
