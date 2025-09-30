import { FunctionResultObject, Maybe } from "./base";
import {
  PivotCollapsedDomains,
  PivotCoreDefinition,
  PivotCustomGroupedField,
  PivotDimension,
  PivotDomain,
  PivotFields,
  PivotMeasure,
  PivotSortedColumn,
} from "./pivot";

export interface PivotRuntimeDefinition {
  readonly measures: PivotMeasure[];
  readonly columns: PivotDimension[];
  readonly rows: PivotDimension[];
  readonly sortedColumn?: PivotSortedColumn;
  readonly collapsedDomains?: PivotCollapsedDomains;
  readonly customFields?: Record<string, PivotCustomGroupedField>;
  getDimension(nameWithGranularity: string): PivotDimension;
  getMeasure(id: string): PivotMeasure;
  [key: string]: unknown;
}

export interface SpreadsheetPivotTable {
  columns: unknown;
  rows: unknown;
  measures: string[];
  fieldsType: Record<string, string | undefined>;
  [key: string]: unknown;
}

export interface InitPivotParams {
  reload?: boolean;
}

export interface Pivot<T = PivotRuntimeDefinition> {
  type: PivotCoreDefinition["type"];
  definition: T;
  init(params?: InitPivotParams): void;
  isValid(): boolean;
  onDefinitionChange(nextDefinition: PivotCoreDefinition): void;
  getCollapsedTableStructure(): SpreadsheetPivotTable;
  getExpandedTableStructure(): SpreadsheetPivotTable;
  getFields(): PivotFields;
  getPivotHeaderValueAndFormat(domain: PivotDomain): FunctionResultObject;
  getPivotCellValueAndFormat(measure: string, domain: PivotDomain): FunctionResultObject;
  getPivotMeasureValue(measure: string, domain: PivotDomain): FunctionResultObject;
  getMeasure(id: string): PivotMeasure;
  parseArgsToPivotDomain(args: Maybe<FunctionResultObject>[]): PivotDomain;
  areDomainArgsFieldsValid(args: Maybe<FunctionResultObject>[]): boolean;
  assertIsValid(options: { throwOnError: boolean }): FunctionResultObject | undefined;
  getPossibleFieldValues(
    dimension: PivotDimension
  ): { value: string | boolean | number; label: string }[];
  needsReevaluation: boolean;
  markAsDirtyForEvaluation?(): void;
}
