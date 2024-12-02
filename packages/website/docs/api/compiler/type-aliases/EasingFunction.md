# EasingFunction

```ts
type EasingFunction:
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | {
  type: "cubic-bezier";
  x1: number;
  x2: number;
  y1: number;
  y2: number;
 }
  | {
  c: number;
  p: "start" | "end" | "jump-none" | "jump-both";
  type: "steps";
};
```

## Type declaration

`"linear"`

`"ease"`

`"ease-in"`

`"ease-out"`

`"ease-in-out"`

\{
`type`: `"cubic-bezier"`;
`x1`: `number`;
`x2`: `number`;
`y1`: `number`;
`y2`: `number`;
\}

### type

```ts
type: "cubic-bezier";
```

### x1

```ts
x1: number;
```

The x-position of the first point in the curve.

### x2

```ts
x2: number;
```

The x-position of the second point in the curve.

### y1

```ts
y1: number;
```

The y-position of the first point in the curve.

### y2

```ts
y2: number;
```

The y-position of the second point in the curve.

\{
`c`: `number`;
`p`: `"start"` \| `"end"` \| `"jump-none"` \| `"jump-both"`;
`type`: `"steps"`;
\}

### c

```ts
c: number;
```

The number of intervals in the function.

### p?

```ts
optional p: "start" | "end" | "jump-none" | "jump-both";
```

The step position.

### type

```ts
type: "steps";
```

## Defined in

[compiler/compiler.types.ts:198](https://github.com/nativewind/react-native-css/blob/83125aa9006bd52788fb23ba03d168e1262bcadb/packages/react-native-css/src/compiler/compiler.types.ts#L198)
