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

[compiler/compiler.types.ts:231](https://github.com/nativewind/react-native-css/blob/a400e1318389c5ae2af21e895162179d7418d761/packages/react-native-css/src/compiler/compiler.types.ts#L231)
