# native-internal

This package is separate from `native` to prevent a circular dependency.

- The `native/index.ts` needs to import the `metro.ts`,
- `metro.ts` import the `.css` files (as a work around for lazy bundles)
- `.css` files import the `StyleCollection`

To prevent multiple versions of `StyleCollection` and relative path issues, we created `native-internal` to break the dependency chain.

This package should contain all the singular globals.
