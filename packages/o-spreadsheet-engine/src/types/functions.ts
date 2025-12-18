import { CellValue } from "./cells";
import { Getters } from "./getters";
import { Locale } from "./locale";
import { Arg, CellPosition, FunctionResultObject, Matrix, UID } from "./misc";
import { Range } from "./range";

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
  | "RANGE<ANY>";

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

export interface AddFunctionDescription {
  compute: ComputeFunction<
    FunctionResultObject | Matrix<FunctionResultObject> | CellValue | Matrix<CellValue>
  >;
  description: string;
  category?: string;
  args: ArgDefinition[];
  isExported?: boolean;
  hidden?: boolean;
}

export type FunctionDescription = AddFunctionDescription & {
  name: string;
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  nbrOptionalNonRepeatingArgs: number;
};

export type EvalContext = {
  __originSheetId: UID;
  __originCellPosition?: CellPosition;
  locale: Locale;
  getters: Getters;
  getRef: (position: CellPosition) => FunctionResultObject;
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
