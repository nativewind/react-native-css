module.exports = {
  preset: "jest-expo/ios",
  roots: ["src"],
  setupFiles: ["<rootDir>/src/jest/setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/jest/setupAfterEnv.ts"],
  moduleNameMapper: {
    "^react-native-css/jsx-runtime$": "<rootDir>/src/jsx/jsx-runtime",
    "^react-native-css/(.*)$": "<rootDir>/src/$1",
  },
};
