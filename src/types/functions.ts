import { CellValue } from "./cells";
import { Getters } from "./getters";
import { Locale } from "./locale";
import { Arg, CellPosition, FPayload, Matrix, UID } from "./misc";
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
  | "RANGE<ANY>"
  | "META";

export interface ArgDefinition {
  acceptMatrix?: boolean;
  acceptMatrixOnly?: boolean;
  repeating?: boolean;
  optional?: boolean;
  description: string;
  name: string;
  type: ArgType[];
  default?: boolean;
  defaultValue?: any;
}

export type ComputeFunction<R> = (this: EvalContext, ...args: Arg[]) => R;

export interface AddFunctionDescription {
  compute: ComputeFunction<FPayload | Matrix<FPayload> | CellValue | Matrix<CellValue>>;
  description: string;
  category?: string;
  args: ArgDefinition[];
  isExported?: boolean;
  hidden?: boolean;
}

export type FunctionDescription = AddFunctionDescription & {
  minArgRequired: number;
  maxArgPossible: number;
  nbrArgRepeating: number;
  getArgToFocus: (argPosition: number) => number;
};

export type EvalContext = {
  __originSheetId: UID;
  __originCellXC: () => string | undefined;
  locale: Locale;
  getters: Getters;
  [key: string]: any;
  updateDependencies?: (position: CellPosition) => void;
  addDependencies?: (position: CellPosition, ranges: Range[]) => void;
};
