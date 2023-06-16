import { Format } from "./format";
import { FunctionReturnFormat, FunctionReturnValue, Matrix } from "./misc";

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

export interface ArgDefinition<T extends ArgType = ArgType> {
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

export interface AddFunctionDescription<Args extends readonly ArgDefinition[] = any[]> {
  readonly description: string;
  readonly compute: ComputeFunction<ArgsToTypescript<Args>, FunctionReturnValue>;
  readonly computeFormat?: ComputeFunction<FullArgsToTypescript<Args>, FunctionReturnFormat>;
  readonly category?: string;
  readonly args: Args;
  readonly returns: Readonly<[ArgType]>;
  readonly isExported?: boolean;
  readonly hidden?: boolean;
}

type ArgTypesToDefinition<Type extends readonly ArgType[]> = {
  [K in keyof Type]: ArgDefinition<Type[K]>;
};

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

export type InferArgType<A extends string> = InferArgProperties<A> extends ArgType
  ? InferArgProperties<A>
  : never;

export type InferArgProperties<A extends string> = A extends `${infer N}(${infer T})`
  ? Trim<CsvToUnion<Uppercase<T>>>
  : never;
type CsvToUnion<A extends string> = A extends `${infer N},${infer T}` ? N | CsvToUnion<T> : A;
type Trim<A extends string> = A extends ` ${infer N}`
  ? Trim<N>
  : A extends `${infer N} `
  ? Trim<N>
  : A;

type ToTypescriptType<A extends string> = A extends ArgType | "OPTIONAL" ? TypeMapping[A] : never;

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
  OPTIONAL: undefined;
};

type ArgsToTypescript<Type extends readonly ArgDefinition[]> = {
  [K in keyof Type]: ToTypescriptType<Type[K]["type"][number]>;
};
type FullArgsToTypescript<Type extends readonly ArgDefinition[]> = {
  [K in keyof Type]: {
    value: ToTypescriptType<Type[K]["type"][number]>;
    format: Format | undefined;
  };
};
