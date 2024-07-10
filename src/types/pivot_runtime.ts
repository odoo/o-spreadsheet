import { PivotRuntimeDefinition } from "../helpers/pivot/pivot_runtime_definition";
import { SpreadsheetPivotTable } from "../helpers/pivot/table_spreadsheet_pivot";
import { FunctionResultObject, Maybe } from "./misc";
import {
  PivotCoreDefinition,
  PivotDimension,
  PivotDomain,
  PivotFields,
  PivotMeasure,
} from "./pivot";

export interface InitPivotParams {
  reload?: boolean;
}
export interface Pivot<T = PivotRuntimeDefinition> {
  type: PivotCoreDefinition["type"];
  definition: T;
  init(params?: InitPivotParams): void;
  isValid(): boolean;

  getTableStructure(): SpreadsheetPivotTable;
  getFields(): PivotFields;

  getPivotHeaderValueAndFormat(domain: PivotDomain): FunctionResultObject;
  getPivotCellValueAndFormat(measure: string, domain: PivotDomain): FunctionResultObject;
  getPivotMeasureValue(measure: string, domain: PivotDomain): FunctionResultObject;

  getMeasure: (name: string) => PivotMeasure;

  parseArgsToPivotDomain(args: Maybe<FunctionResultObject>[]): PivotDomain;
  areDomainArgsFieldsValid(args: Maybe<FunctionResultObject>[]): boolean;

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FunctionResultObject | undefined;
  getPossibleFieldValues(
    dimension: PivotDimension
  ): { value: string | boolean | number; label: string }[];
  needsReevaluation: boolean;
}
