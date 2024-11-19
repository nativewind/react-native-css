module.exports = (api) => {
  return api.env("test") ? jest : build;
};

const jest = {
  presets: ["module:babel-preset-expo"],
  plugins: [
    [
      "@babel/plugin-transform-private-methods",
      {
        loose: true,
      },
    ],
  ],
};

const build = {};
