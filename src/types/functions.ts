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

export interface Arg {
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
  specificFormat: string;
}

export interface AddFunctionDescription {
  description: string;
  compute: (this: EvalContext, ...args: any[]) => any;
  async?: boolean;
  category?: string;
  args: Arg[];
  returns: [ArgType];
  returnFormat?: ReturnFormatType.FormatFromArgument | ReturnSpecificFormat;
}

export interface FunctionDescription extends AddFunctionDescription {
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  getArgToFocus: (argPosition: number) => number;
}

export type EvalContext = {
  __lastFnCalled?: string;
  __originCellXC?: string;
  [key: string]: any;
};
