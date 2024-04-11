import { PivotRuntimeDefinition } from "../helpers/pivot/pivot_runtime_definition";
import { SpreadsheetPivotTable } from "../helpers/pivot/spreadsheet_pivot/table_spreadsheet_pivot";
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
  getPossibleFieldValues(groupBy: string): { value: string | boolean | number; label: string }[];
  needsReevaluation: boolean;
}
