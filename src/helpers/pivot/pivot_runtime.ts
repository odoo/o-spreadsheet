import { PivotMeasure } from "../../types/pivot";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";
import { SpreadsheetPivotTable } from "./spreadsheet_pivot_table";

export interface Pivot<T = PivotRuntimeDefinition> {
  definition: T;
  getMeasure: (name: string) => PivotMeasure;
  computePivotHeaderValue(domain: Array<string | number>): string | boolean | number;
  getLastPivotGroupValue(domain: Array<string | number>): string | boolean | number;
  getTableStructure(): SpreadsheetPivotTable;
  getPivotCellValue(measure: string, domain: Array<string | number>): string | boolean | number;
  getPivotFieldFormat(name: string): string;
  getPivotMeasureFormat(name: string): string | undefined;
  assertIsValid({ throwOnError }: { throwOnError: boolean }): boolean;
  isReady(): boolean; //TODOPRO
  load(params: unknown): Promise<void>; //TODOPRO
}
