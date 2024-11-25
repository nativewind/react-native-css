import { shallowEqualObject } from "./equality";

type Equality<Value> = (left: Value, right: Value) => Boolean;

const DEFAULT_ARRAY: never[] = [];
const DEFAULT_OBJECT = {};

export class ProduceRecord<Value extends object | undefined> {
  private record: NonNullable<Value>;
  private draft: NonNullable<Value>;

  constructor(
    record: Value,
    private equality = shallowEqualObject,
  ) {
    this.record = record ?? (DEFAULT_OBJECT as NonNullable<Value>);
    this.draft = this.record;
  }

  assign(value?: Value) {
    if (!value) return this;
    this.draft = Object.assign({}, this.draft, value);
    return this;
  }

  assignAll(values: Value[]) {
    this.draft = Object.assign({}, this.draft, ...values);
    return this;
  }

  commit() {
    // If something was added, this will be a new object
    if (this.draft === DEFAULT_OBJECT) {
      return undefined;
    }

    if (!this.equality(this.record, this.draft)) {
      this.record = this.draft;
    }
    return this.record;
  }
}

export class ProduceArray<Value extends any[] | undefined> {
  private array: Value;
  private draft: NonNullable<Value>;

  constructor(
    array: Value,
    private equality: Equality<Value> = Object.is,
  ) {
    this.array = array ?? (DEFAULT_ARRAY as unknown as Value);
    this.draft = [] as unknown as NonNullable<Value>;
  }

  push(value: NonNullable<Value>[number]) {
    const previous = this.array?.[this.draft.length];

    if (
      previous !== undefined &&
      this.draft !== this.array &&
      this.equality(previous, value)
    ) {
      this.draft.push(previous);
    } else {
      this.draft.push(value);
      this.array = this.draft;
    }

    return this;
  }

  pushAll(values: NonNullable<Value>) {
    for (const value of values) {
      this.push(value);
    }
    return this;
  }

  commit() {
    if (Object.is(this.array, DEFAULT_ARRAY)) {
      return undefined as Value;
    }

    return this.draft.length === this.array!.length ? this.array : this.draft;
  }
}
