# CSS variable input units

Use explicit CSS lengths when a variable supplies a dimension in an application that also targets browsers:

```tsx
<VariableContextProvider value={{ "--card-width": "80.5px", "--opacity": 0.5 }}>
  <View className="card" />
</VariableContextProvider>
```

```css
.card {
  width: var(--card-width);
  opacity: var(--opacity);
}
```

The native engine converts pixel strings to React Native numeric dimensions. Fractional values must remain fractional when the variable is inherited or updated. The proposed Expo upgrade fixes the previous truncation of `80.5px` to `80`.

Browser custom properties retain their CSS token values. A nonzero unitless number is invalid when substituted directly into `width`, while a unitless opacity or scale factor is valid. The library cannot append `px` to every numeric variable without changing those other uses. Use a pixel string for lengths.

`vars()` remains a deprecated input path; the same unit contract applies. Prefer `VariableContextProvider` for new code. Source tests cover fractional pixel values through both APIs and their updates. Compatibility evidence keeps the original numeric width case distinct from the explicit length case rather than changing the original expectation.
