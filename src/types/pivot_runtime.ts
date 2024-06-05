import { PivotRuntimeDefinition } from "../helpers/pivot/pivot_runtime_definition";
import { SpreadsheetPivotTable } from "../helpers/pivot/spreadsheet_pivot/table_spreadsheet_pivot";
import { FPayload } from "./misc";
import { PivotCoreDefinition, PivotDomain, PivotFields, PivotMeasure } from "./pivot";

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

  getPivotHeaderValueAndFormat(domain: PivotDomain): FPayload;
  getPivotCellValueAndFormat(measure: string, domain: PivotDomain): FPayload;
  getPivotMeasureValue(measure: string, domain: PivotDomain): FPayload;

  getMeasure: (name: string) => PivotMeasure;

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FPayload | undefined;
  getPossibleFieldValues(groupBy: string): { value: string | boolean | number; label: string }[];
  needsReevaluation: boolean;
}
