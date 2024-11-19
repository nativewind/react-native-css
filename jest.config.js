module.exports = {
  preset: "jest-expo/ios",
  roots: ["src"],
  setupFiles: ["<rootDir>/src/jest/setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/jest/setupAfterEnv.ts"],
  moduleNameMapper: {
    "^react-native-css$": "<rootDir>/src/jest",
    "^react-native-css/(.*)$": "<rootDir>/src/jest/$1",
  },
};
