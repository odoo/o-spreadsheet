import type { CellValue } from "./cells";
import type { Format } from "./format";
import type { Locale } from "./locale";
import type { Arg, ArgValue, Matrix, ValueAndFormat } from "./misc";

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
  acceptMatrix?: boolean;
  repeating?: boolean;
  optional?: boolean;
  lazy?: boolean;
  description: string;
  name: string;
  type: ArgType[];
  default?: boolean;
  defaultValue?: any;
}

export type ComputeFunctionArg<T> = T | (() => T);
export type ComputeFunction<T, R> = (this: EvalContext, ...args: ComputeFunctionArg<T>[]) => R;

interface AddFunctionDescriptionBase {
  description: string;
  category?: string;
  args: ArgDefinition[];
  returns: [ArgType];
  isExported?: boolean;
  hidden?: boolean;
}

interface ComputeValue {
  compute: ComputeFunction<ArgValue, CellValue | Matrix<CellValue>>;
}

interface ComputeFormat {
  computeFormat: ComputeFunction<Arg, Format | undefined | Matrix<Format | undefined>>;
}

interface ComputeValueAndFormat {
  computeValueAndFormat: ComputeFunction<Arg, Matrix<ValueAndFormat> | ValueAndFormat>;
}

export type AddFunctionDescription =
  | (AddFunctionDescriptionBase & ComputeValue & Partial<ComputeFormat>)
  | (AddFunctionDescriptionBase & ComputeValueAndFormat);

export type FunctionDescription = AddFunctionDescription & {
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  getArgToFocus: (argPosition: number) => number;
};

export type EvalContext = {
  __lastFnCalled?: string;
  __originCellXC?: () => string;
  locale: Locale;
  [key: string]: any;
};
