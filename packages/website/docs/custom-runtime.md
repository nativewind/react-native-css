---
sidebar_position: 3
title: Integrating a custom runtime
---

# Intro

Writing a custom runtime is a complex endeavour, too complex for a single guide. This page will break down the `ReactNativeCssStyleSheet` object returned by `react-native-css/compiler` and explain how to integrate it into your project.

As this output is included in the final JavaScript bundle, it is optimized for size and parsing speed. This means that the output is not human-friendly.

## Understanding `StyleRules`

The first misconception is that the output will appear similar to `StyleSheet.create`. This is not the case, as a single CSS class can have multiple rules with different specificities. The style rules are stores as a tuple of `[className, [StyleRule[], StyleRule[]]` styles on the [`s` property](docs/api/compiler/interfaces/ReactNativeCssStyleSheet#s).

A single className can have multiple normal and/or important rules, hence the second value is an array of 1-2 arrays of style rules. The first index is the normal rules, the second index is the important rules.

A StyleRule is the style object and the meta-data about when those rules should apply.

```ts
const stylesheet: ReactNativeStyleSheet = {
  s: [
    [
      "my-class",
      [
        [
          {
            // The specificity of the rule
            s: [1, 1],
            // The rules declarations
            d: [
              {
                color: "red",
              },
            ],
          },
          {
            // A media query for @media (width: 500px)
            m: [["=", "width", 500]],
            // This rule has a higher specificity than the non-media query version
            s: [2, 1],
            // The rules declarations
            d: [
              {
                color: "blue",
              },
            ],
          },
        ],
      ],
    ],
  ],
};
```

## Complex declarations

In the last example, we used a simple declaration of `{ color: 'red' }`. When the styles are static, they will be a an object. When they are dynamic they use the following structure

```ts
const styleRule = {
  // The specificity of the rule
  s: [1, 1]
  d: [
    [
      [{}, "var", [ "color"]], // A complex value
      "color", // The property that we are setting
      1 // A flag to indicate that value might depend on other rules
    ]
  ]
}
```

In this example, the declarations are no longer a simple object. It is a tuple with 2-3 indices. The first is the value, the second is the property, and the third is an optional flag to indicate that the value might depend on other rules.

Complex values are presented by a tuple of 3 values. The first is an empty object and can be safely ignored. Its purpose is to help you identify when you are processing a complex value or just an array of values (like `transform: [{ rotate: '90deg' }]`).

The second value is a dot notation path on where to set the value. In this case, it is `color`, but if the second index was `headerOptions.color` it would set the value on `headerOptions: { color: <value> }`. This is used for the `shadow` styles and setting custom props.

The third value is a flag to indicate that the value might depend on other rules. For example, because this style uses the `var` function, another style might set the value of `color` and this style will use that value.
