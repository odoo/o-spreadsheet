import { CellValue } from "./cells";
import { Format } from "./format";
import { FunctionReturnFormat, FunctionReturnValue, Matrix, PrimitiveArgValue } from "./misc";

export type ArgType =
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

export interface ArgDefinition<T extends ArgType | "OPTIONAL" = ArgType> {
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

const a: ComputeFunction<[number | Matrix<number>, number | Matrix<number>], number> = function (
  value1: number,
  value2: number
): number {
  return 2;
};
a([[5]]);

export interface AddFunctionDescription<Args extends readonly ArgDefinition[] = any[]> {
  readonly description: string;
  readonly compute: ComputeFunction<ArgValuesToTypescript<Args>, FunctionReturnValue>;
  readonly computeFormat?: ComputeFunction<FullArgsToTypescript<Args>, FunctionReturnFormat>;
  readonly category?: string;
  readonly args: Args;
  readonly returns: Readonly<[ArgType]>;
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

export type InferArgType<A extends string> = Extract<InferArgProperties<A>, ArgType | "OPTIONAL">;

export type InferArgProperties<A extends string> = A extends `${infer N}(${infer T})`
  ? Trim<CsvToUnion<Uppercase<T>>>
  : never;
type CsvToUnion<A extends string> = A extends `${infer N},${infer T}` ? N | CsvToUnion<T> : A;
type Trim<A extends string> = A extends ` ${infer N}`
  ? Trim<N>
  : A extends `${infer N} `
  ? Trim<N>
  : A;

type ToTypescript<A extends string> = A extends ArgType | "OPTIONAL" | "REPEATING"
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

type ArgValuesToTypescript<Args extends readonly ArgDefinition[]> = {
  [K in keyof Args]: Args[K]["lazy"] extends true
    ? () => ArgToTypescript<Args[K]>
    : ArgToTypescript<Args[K]>;
};
type FullArgsToTypescript<Args extends readonly ArgDefinition[]> = {
  [K in keyof Args]: Args[K]["lazy"] extends true ? () => AArg<Args[K]> : AArg<Args[K]>;
};

type ArgToTypescript<A extends ArgDefinition> = ToTypescript<A["type"][number]>;

export type AArg<A extends ArgDefinition> = {
  value: ArgToTypescript<A>;
  format?: Format | undefined | Matrix<Format | undefined>;
};
// type FullArgToTypescript<A extends ArgDefinition> = A["lazy"] extends true ? () => AA<A> : AA<A>;
