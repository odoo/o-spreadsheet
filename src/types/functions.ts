import { Format } from "./format";
import { Arg, Argument, ReturnValue } from "./misc";

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
  compute: ComputeFunction<Argument, ReturnValue>;
  computeFormat?: ComputeFunction<Arg, Format | undefined>;
  category?: string;
  args: ArgDefinition[];
  returns: [ArgType];
  isExported?: boolean;
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
