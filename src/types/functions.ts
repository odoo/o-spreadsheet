import { Arg, ArgValue, FunctionReturnFormat, FunctionReturnValue } from "./misc";

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
  | "RANGE<ANY>"
  | "META";

export interface ArgDefinition {
  repeating?: boolean;
  optional?: boolean;
  lazy?: boolean;
  description: string;
  name: string;
  type: ArgType[];
  default?: boolean;
  defaultValue?: any;
}

export type ComputeFunctionArg<T> = T | (() => T) | undefined;
export type ComputeFunction<T, R> = (this: EvalContext, ...args: ComputeFunctionArg<T>[]) => R;

export interface AddFunctionDescription {
  description: string;
  compute: ComputeFunction<ArgValue, FunctionReturnValue>;
  computeFormat?: ComputeFunction<Arg, FunctionReturnFormat>;
  category?: string;
  args: ArgDefinition[];
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
