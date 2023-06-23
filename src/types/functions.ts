import { CellValue } from "./cells";
import { Format } from "./format";
import { FunctionReturnFormat, FunctionReturnValue, Matrix, PrimitiveArgValue } from "./misc";

export type ArgTypeSpec =
  | "ANY"
  | "BOOLEAN"
  | "NUMBER"
  | "STRING"
  | "DATE"
  | "RANGE"
  | "RANGE<BOOLEAN>"
  | "RANGE<NUMBER>"
  | "RANGE<DATE>"
  | "RANGE<STRING>"
  | "META";

export interface ArgSpec<T extends ArgTypeSpec | "OPTIONAL" = ArgTypeSpec> {
  repeating?: boolean;
  optional?: boolean;
  lazy?: boolean;
  description: string;
  name: string;
  type: T[];
  default?: boolean;
  defaultValue?: any;
}

export type ComputeFunctionArg<T> = {
  [K in keyof T]: T;
};
export type ComputeFunction<T extends readonly any[], R> = (this: EvalContext, ...args: T) => R;

export interface AddFunctionDescription<Args extends readonly ArgSpec[] = any[]> {
  readonly description: string;
  readonly compute: ComputeFunction<ArgValueTypeArray<Args>, FunctionReturnValue>;
  readonly computeFormat?: ComputeFunction<ArgTypeArray<Args>, FunctionReturnFormat>;
  readonly category?: string;
  readonly args: Args;
  readonly returns: Readonly<[ArgTypeSpec]>;
  readonly isExported?: boolean;
  readonly hidden?: boolean;
}

export interface FunctionDescription extends AddFunctionDescription {
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  getArgToFocus: (argPosition: number) => number;
}

export type EvalContext = {
  __lastFnCalled?: string;
  __originCellXC?: () => string;
  [key: string]: any;
};

export type InferArgType<A extends string> = Extract<
  InferArgProperties<A>,
  ArgTypeSpec | "OPTIONAL"
>;

export type InferArgProperties<A extends string> = A extends `${infer N}(${infer T})`
  ? Trim<CsvToUnion<Uppercase<T>>>
  : never;
type CsvToUnion<A extends string> = A extends `${infer N},${infer T}` ? N | CsvToUnion<T> : A;
type Trim<A extends string> = A extends ` ${infer N}`
  ? Trim<N>
  : A extends `${infer N} `
  ? Trim<N>
  : A;

type ToTypescript<A extends string> = A extends ArgTypeSpec | "OPTIONAL" | "REPEATING"
  ? TypeMapping[A]
  : never;

type TypeMapping = {
  BOOLEAN: boolean;
  // "HANDLE ERROR": Error;
  NUMBER: number;
  STRING: string;
  DATE: number;
  "RANGE<BOOLEAN>": Matrix<boolean>;
  "RANGE<NUMBER>": Matrix<number>;
  "RANGE<STRING>": Matrix<string>;
  "RANGE<DATE>": Matrix<number>;
  OPTIONAL: undefined;
  // no automatic casting
  META: PrimitiveArgValue;
  ANY: PrimitiveArgValue;
  REPEATING: PrimitiveArgValue;
  RANGE: Matrix<CellValue | undefined>;
};

type ArgValueTypeArray<Args extends readonly ArgSpec[]> = {
  [K in keyof Args]: Args[K]["lazy"] extends true
    ? () => ArgTypeSimple<Args[K]>
    : ArgTypeSimple<Args[K]>;
};
type ArgTypeArray<Args extends readonly ArgSpec[]> = {
  // [K in keyof Args]: Args[K]["lazy"] extends true ? () => AArg<Args[K]> : AArg<Args[K]>;
  [K in keyof Args]: Lazyfy<Args[K], AArg<Args[K]>>;
};

type ArgTypeSimple<A extends ArgSpec> = ToTypescript<A["type"][number]>;

export type AArg<A extends ArgSpec> = {
  value: ArgTypeSimple<A>;
  format?: Format | undefined | Matrix<Format | undefined>;
};

type Lazyfy<A extends ArgSpec, V> = A["lazy"] extends true ? () => V : V;
