import { Format } from "./format";
import { Argument } from "./misc";

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

export enum ReturnFormatType {
  FormatFromArgument = "FormatFromArgument",
}

export interface ReturnSpecificFormat {
  specificFormat: Format;
}

export interface AddFunctionDescription {
  description: string;
  compute: (this: EvalContext, ...args: (Argument | (() => Argument))[]) => any;
  category?: string;
  args: ArgDefinition[];
  returns: [ArgType];
  returnFormat?: ReturnFormatType.FormatFromArgument | ReturnSpecificFormat;
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
