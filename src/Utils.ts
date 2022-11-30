namespace Utils {
  export namespace Types {
    export type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U
      ? 1
      : 2
      ? Y
      : N;

    export type Equals<A, B> = IfEquals<A, B, true, false>;

    export type AnyFn = (...args: any[]) => any;

    export type StringUnion<Values extends string = string> = {
      values: Values[];
      guard: (value: string) => value is Values;
      type: Values;
    };

    export const makeStringUnion = <Values extends string>(...values: Values[]) => {
      Object.freeze(values);

      const guard = (value: string): value is Values => {
        return values.includes(value as Values);
      };

      return Object.freeze({
        values,
        guard,
      } as StringUnion<Values>);
    };
  }
}

export default Utils;
