import { Arg, ArgValue, FunctionReturnFormat, FunctionReturnValue, Matrix } from "./misc";

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

export interface ArgDefinition<T extends string> {
  repeating?: boolean;
  optional?: boolean;
  lazy?: boolean;
  description: string;
  name: string;
  type: InferArgType<T>[];
  default?: boolean;
  defaultValue?: any;
}

export type ComputeFunctionArg<T> = T | (() => T) | undefined;
export type ComputeFunction<T, R> = (this: EvalContext, ...args: ComputeFunctionArg<T>[]) => R;

export interface AddFunctionDescription<Args extends ArgDefinition<any>[] = any[]> {
  description: string;
  compute: ComputeFunction<ArgValue, FunctionReturnValue>;
  computeFormat?: ComputeFunction<Arg, FunctionReturnFormat>;
  category?: string;
  args: Args;
  returns: [ArgType];
  isExported?: boolean;
  hidden?: boolean;
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

type InferArgType<A extends string> = A extends `${infer N}(${infer T})`
  ? Trim<CsvToUnion<Uppercase<T>>>
  : never;
type CsvToUnion<A extends string> = A extends `${infer N},${infer T}` ? N | CsvToUnion<T> : A;
type Trim<A extends string> = A extends ` ${infer N}`
  ? Trim<N>
  : A extends `${infer N} `
  ? Trim<N>
  : A;

type ToTypescriptType<A extends string> = A extends ArgType ? TypeMapping[A] : never;

type TypeMapping = {
  ANY: any;
  BOOLEAN: boolean;
  NUMBER: number;
  STRING: string;
  DATE: Date;
  RANGE: any[];
  "RANGE<BOOLEAN>": Matrix<boolean>;
  "RANGE<NUMBER>": Matrix<number>;
  "RANGE<STRING>": Matrix<string>;
  "RANGE<DATE>": Matrix<Date>;
  META: any;
};

type TEST = InferArgType<"my_arg (number, range<number>, default=10)">;
