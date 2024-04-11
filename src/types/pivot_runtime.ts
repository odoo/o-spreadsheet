import { PivotRuntimeDefinition } from "../helpers/pivot/pivot_runtime_definition";
import { SpreadsheetPivotTable } from "../helpers/pivot/spreadsheet_pivot/spreadsheet_pivot_table";
import { FPayload } from "./misc";
import { PivotCoreDefinition, PivotFields, PivotMeasure, StringDomainArgs } from "./pivot";

export interface InitPivotParams {
  reload?: boolean;
}
export interface Pivot<T = PivotRuntimeDefinition> {
  type: PivotCoreDefinition["type"];
  definition: T;
  init(params?: InitPivotParams): void;
  isValid(): boolean;

  getTableStructure(): SpreadsheetPivotTable;
  getFields(): PivotFields | undefined;

  getPivotHeaderValueAndFormat(domain: StringDomainArgs): FPayload;
  getPivotCellValueAndFormat(measure: string, domain: StringDomainArgs): FPayload;

  getMeasure: (name: string) => PivotMeasure;

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FPayload | undefined;
  getLastPivotGroupValue(domain: Array<string | number>): string | boolean | number;
  getPossibleFieldValues(groupBy: string): { value: string | boolean | number; label: string }[];
  isDirtyForEvaluation: boolean;
}
