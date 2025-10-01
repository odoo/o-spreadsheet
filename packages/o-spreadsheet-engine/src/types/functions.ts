import { Arg, CellPosition, CellValue, FunctionResultObject, Matrix, UID } from "./index";
import { Locale } from "./locale";

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
  | "META"
  | "RANGE<META>";

export interface ArgDefinition {
  acceptMatrix?: boolean;
  acceptMatrixOnly?: boolean;
  acceptErrors?: boolean;
  repeating?: boolean;
  optional?: boolean;
  description: string;
  name: string;
  type: ArgType[];
  default?: boolean;
  defaultValue?: any;
  proposalValues?: ArgProposal[];
}

export type ArgProposal = { value: CellValue; label?: string };
export type ComputeFunction<R> = (this: EvalContext, ...args: Arg[]) => R;

export interface Functions {
  compute: ComputeFunction<
    FunctionResultObject | Matrix<FunctionResultObject> | CellValue | Matrix<CellValue>
  >;
  description: string;
  category?: string;
  args: ArgDefinition[];
  isExported?: boolean;
  hidden?: boolean;
}

export type FunctionDescription = Functions & {
  name: string;
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  nbrArgOptional: number;
};
export type EvalContext = {
  __originSheetId: UID;
  __originCellPosition?: CellPosition;
  locale: Locale;
  getters: Getters;
  [key: string]: any;
  updateDependencies?: (position: CellPosition) => void;
  addDependencies?: (position: CellPosition, ranges: Range[]) => void;
  debug?: boolean;
  lookupCaches?: LookupCaches;
};
/**
 * used to cache lookup values for linear search
 **/
export type LookupCaches = {
  forwardSearch: Map<unknown, Map<CellValue, number>>;
  reverseSearch: Map<unknown, Map<CellValue, number>>;
};
