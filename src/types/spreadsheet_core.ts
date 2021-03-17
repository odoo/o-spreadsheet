import { CellType, CompiledFormula, Range, UID } from ".";

export interface InternalCell {
  id: UID;
  styleId?: UID;
  contentId?: UID;
  formatId?: UID;
  value: any;
}

export interface CellFormulaContent {
  type: CellType.formula;
  formula: {
    text: string;
    compiledFormula: CompiledFormula;
    format?: string;
  };
  dependencies: Range[];
  value: any;
}

export interface CellTextContent {
  type: CellType.text | CellType.number;
  text: string;
  value: any;
}

export interface CellInvalidFormulaContent {
  type: CellType.invalidFormula;
  text: string;
  error: string;
  value: any;
}

export interface CellEmptyContent {
  type: CellType.empty;
}

export interface CellBooleanContent {
  type: CellType.boolean;
  text: string;
  value: boolean;
}

export type CellContent =
  | CellFormulaContent
  | CellBooleanContent
  | CellTextContent
  | CellEmptyContent
  | CellInvalidFormulaContent;
