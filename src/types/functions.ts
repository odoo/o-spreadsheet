export type ArgType =
  | "ANY"
  | "BOOLEAN"
  | "NUMBER"
  | "STRING"
  | "DATE"
  | "RANGE"
  | "RANGE<BOOLEAN>"
  | "RANGE<NUMBER>"
  | "RANGE<STRING>";

export interface Arg {
  repeating?: boolean;
  optional?: boolean;
  lazy?: boolean;
  description: string;
  name: string;
  type: ArgType[];
  default?: any;
}

export interface FunctionDescription {
  description: string;
  compute: (this: EvalContext, ...args: any[]) => any;
  async?: boolean;
  category?: string;
  args: Arg[];
  returns: [ArgType];
}

export interface EvalContext {
  __lastFnCalled?: string;
  [key: string]: any;
}
