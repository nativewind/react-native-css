# TransitionRule

```ts
type TransitionRule: object;
```

************\*\*\*\************* Transitions ************\*\*\*\*************

## Type declaration

### de?

```ts
optional de: number[];
```

Delay before the transition starts in milliseconds.

### du?

```ts
optional du: number[];
```

Duration of the transition in milliseconds.

### e?

```ts
optional e: EasingFunction[];
```

Easing function for the transition.

### p?

```ts
optional p: string[];
```

Property to transition.

## Defined in

[compiler/compiler.types.ts:237](https://github.com/nativewind/react-native-css/blob/83125aa9006bd52788fb23ba03d168e1262bcadb/packages/react-native-css/src/compiler/compiler.types.ts#L237)
