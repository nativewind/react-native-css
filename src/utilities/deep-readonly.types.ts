export type DeepReadonly<Value> = {
  readonly [Key in keyof Value]: DeepReadonly<Value[Key]>;
};
