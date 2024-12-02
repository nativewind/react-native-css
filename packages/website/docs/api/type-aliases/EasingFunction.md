# Type Alias: EasingFunction

> **EasingFunction**: `"linear"` \| `"ease"` \| `"ease-in"` \| `"ease-out"` \| `"ease-in-out"` \| \{`type`: `"cubic-bezier"`;`x1`: `number`;`x2`: `number`;`y1`: `number`;`y2`: `number`; \} \| \{`c`: `number`;`p`: `"start"` \| `"end"` \| `"jump-none"` \| `"jump-both"`;`type`: `"steps"`; \}

## Type declaration

`"linear"`

`"ease"`

`"ease-in"`

`"ease-out"`

`"ease-in-out"`

\{`type`: `"cubic-bezier"`;`x1`: `number`;`x2`: `number`;`y1`: `number`;`y2`: `number`; \}

### type

> **type**: `"cubic-bezier"`

### x1

> **x1**: `number`

The x-position of the first point in the curve.

### x2

> **x2**: `number`

The x-position of the second point in the curve.

### y1

> **y1**: `number`

The y-position of the first point in the curve.

### y2

> **y2**: `number`

The y-position of the second point in the curve.

\{`c`: `number`;`p`: `"start"` \| `"end"` \| `"jump-none"` \| `"jump-both"`;`type`: `"steps"`; \}

### c

> **c**: `number`

The number of intervals in the function.

### p?

> `optional` **p**: `"start"` \| `"end"` \| `"jump-none"` \| `"jump-both"`

The step position.

### type

> **type**: `"steps"`

## Defined in

[runtime.types.ts:219](https://github.com/nativewind/react-native-css/blob/0419a1b0b908b601d12a297cd9a323026e985f88/packages/react-native-css/src/runtime/runtime.types.ts#L219)
