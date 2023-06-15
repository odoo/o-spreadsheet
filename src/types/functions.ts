import { Arg, ArgValue, FunctionReturn, FunctionReturnFormat, FunctionReturnValue } from "./misc";

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

interface AddFunctionDescriptionBase {
  description: string;
  category?: string;
  args: ArgDefinition[];
  returns: [ArgType];
  isExported?: boolean;
  hidden?: boolean;
}
interface AddFunctionDescription1 extends AddFunctionDescriptionBase {
  compute: ComputeFunction<ArgValue, FunctionReturnValue>;
  computeFormat?: ComputeFunction<Arg, FunctionReturnFormat>;
}

interface AddFunctionDescription2 extends AddFunctionDescriptionBase {
  computeValueAndFormat: ComputeFunction<Arg, FunctionReturn>;
}

export type AddFunctionDescription = AddFunctionDescription1 | AddFunctionDescription2;

export type FunctionDescription = AddFunctionDescription & {
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  getArgToFocus: (argPosition: number) => number;
};

export type EvalContext = {
  __lastFnCalled?: string;
  __originCellXC?: () => string;
  [key: string]: any;
};
