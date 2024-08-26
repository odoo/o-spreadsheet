import { handleError } from "../../../functions";
import { toString } from "../../../functions/helpers";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import {
  CellValueType,
  EvaluatedCell,
  FunctionResultObject,
  Getters,
  Maybe,
  Range,
  UID,
  Zone,
} from "../../../types";
import { CellErrorType, EvaluationError } from "../../../types/errors";
import {
  Granularity,
  PivotDimension,
  PivotDomain,
  PivotFields,
  PivotMeasure,
  PivotNode,
  SpreadsheetPivotCoreDefinition,
  TechnicalName,
} from "../../../types/pivot";
import { InitPivotParams, Pivot } from "../../../types/pivot_runtime";
import { toXC } from "../../coordinates";
import { isDateTimeFormat } from "../../format/format";
import { isDefined } from "../../misc";
import {
  AGGREGATORS_FN,
  areDomainArgsFieldsValid,
  parseDimension,
  toNormalizedPivotValue,
} from "../pivot_helpers";
import { PivotParams } from "../pivot_registry";
import { pivotTimeAdapter } from "../pivot_time_adapter";
import { SpreadsheetPivotTable } from "../table_spreadsheet_pivot";
import {
  DataEntries,
  DataEntry,
  dataEntriesToSpreadsheetPivotTable,
  groupPivotDataEntriesBy,
} from "./data_entry_spreadsheet_pivot";
import { createDate } from "./date_spreadsheet_pivot";
import { SpreadsheetPivotRuntimeDefinition } from "./runtime_definition_spreadsheet_pivot";

interface SpreadsheetPivotParams extends PivotParams {
  definition: SpreadsheetPivotCoreDefinition;
}

/**
 * This class represents a pivot table that is created from a range of cells.
 * It will extract the fields from the first row of the range and the data from
 * the rest of the rows.
 */
export class SpreadsheetPivot implements Pivot<SpreadsheetPivotRuntimeDefinition> {
  readonly type = "SPREADSHEET";
  private getters: Getters;
  private _definition: SpreadsheetPivotRuntimeDefinition | undefined;
  private coreDefinition: SpreadsheetPivotCoreDefinition;
  /**
   * This array contains the data entries of the pivot. Each entry is an object
   * that contains the values of the fields for a row.
   */
  private dataEntries: DataEntries = [];
  private fields: PivotFields = {};
  /**
   * This array contains the keys of the fields. It is used to keep the order
   * of the fields as they are in the range.
   */
  private fieldKeys: TechnicalName[] = [];
  /**
   * This object contains the pivot table structure. It is created from the
   * data entries and the pivot definition.
   */
  private table: SpreadsheetPivotTable | undefined;
  /**
   * This error is set when the range is invalid. It is used to show an error
   * message to the user.
   */
  private invalidRangeError: EvaluationError | Error | undefined;
  /**
   * This flag is used to know when the pivot needs to be reloaded. It's only
   * used in the evaluation process. At the end of each cycle, the flag is set
   * to true so the pivot is reloaded in the next cycle.
   */
  needsReevaluation: boolean = true;

  constructor(custom: ModelConfig["custom"], params: SpreadsheetPivotParams) {
    this.getters = params.getters;
    this.coreDefinition = params.definition;
  }

  init(params: InitPivotParams = {}) {
    if (!this._definition || params.reload) {
      this.invalidRangeError = undefined;
      if (this.coreDefinition.dataSet) {
        const { zone, sheetId } = this.coreDefinition.dataSet;
        const range = this.getters.getRangeFromZone(sheetId, zone);
        try {
          ({ fields: this.fields, fieldKeys: this.fieldKeys } = this.extractFieldsFromRange(range));
        } catch (e) {
          this.fields = {};
          this.fieldKeys = [];
          this.invalidRangeError = e;
        }
      } else {
        this.invalidRangeError = new EvaluationError(
          _t("The pivot cannot be created because the dataset is missing.")
        );
      }
      this._definition = new SpreadsheetPivotRuntimeDefinition(
        this.coreDefinition,
        this.fields,
        this.getters
      );
      this.table = undefined;
      this.dataEntries = [];
      const range = this._definition.range;
      if (this.isValid() && range) {
        this.dataEntries = this.extractDataEntriesFromRange(range);
      }
      this.needsReevaluation = false;
    }
  }

  get isInvalidRange() {
    return !!this.invalidRangeError;
  }

  get invalidRangeMessage() {
    return this.invalidRangeError?.message;
  }

  get definition() {
    if (!this._definition) {
      this.init();
    }
    if (!this._definition) {
      throw new Error("Pivot definition should be defined at this point.");
    }
    return this._definition;
  }

  isValid(): boolean {
    if (this.invalidRangeError || !this.definition) {
      return false;
    }
    for (const measure of this.definition.measures) {
      if (!measure.isValid) {
        return false;
      }
    }
    for (const column of this.definition.columns) {
      if (!column.isValid) {
        return false;
      }
    }
    for (const row of this.definition.rows) {
      if (!row.isValid) {
        return false;
      }
    }
    return true;
  }

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FunctionResultObject | undefined {
    if (!this.isValid()) {
      if (throwOnError) {
        if (this.invalidRangeError) {
          throw this.invalidRangeError;
        } else {
          throw new EvaluationError(_t("At least one measure and/or dimension is not correct."));
        }
      }
      return {
        value: CellErrorType.GenericError,
        message:
          this.invalidRangeError?.message ??
          _t("At least one measure and/or dimension is not correct."),
      };
    }
    return undefined;
  }

  areDomainArgsFieldsValid(args: Maybe<FunctionResultObject>[]): boolean {
    let dimensions = args.filter((_, index) => index % 2 === 0).map(toString);
    if (dimensions.length && dimensions.at(-1) === "measure") {
      dimensions = dimensions.slice(0, -1);
    }
    return areDomainArgsFieldsValid(dimensions, this.definition);
  }

  parseArgsToPivotDomain(args: Maybe<FunctionResultObject>[]): PivotDomain {
    const domain: PivotDomain = [];
    for (let i = 0; i < args.length - 1; i += 2) {
      const fieldWithGranularity = toString(args[i]);
      const type = this.getTypeOfDimension(fieldWithGranularity);
      const normalizedValue =
        fieldWithGranularity === "measure"
          ? toString(args[i + 1])
          : toNormalizedPivotValue(this.getDimension(fieldWithGranularity), args[i + 1]);
      domain.push({ field: fieldWithGranularity, value: normalizedValue, type });
    }
    return domain;
  }

  markAsDirtyForEvaluation(): void {
    this.needsReevaluation = true;
  }

  getMeasure(id: string): PivotMeasure {
    return this.definition.getMeasure(id);
  }

  getPivotMeasureValue(id: string): FunctionResultObject {
    return {
      value: this.getMeasure(id).displayName,
    };
  }

  getPivotHeaderValueAndFormat(domain: PivotDomain): FunctionResultObject {
    const lastNode = domain.at(-1);
    if (!lastNode) {
      return { value: _t("Total") };
    }
    const dimension = this.getDimension(lastNode.field);
    const cells = this.filterDataEntriesFromDomain(this.dataEntries, domain);
    const finalCell = cells[0]?.[dimension.nameWithGranularity];
    if (dimension.type === "date") {
      const adapter = pivotTimeAdapter(dimension.granularity as Granularity);
      return adapter.toValueAndFormat(lastNode.value, this.getters.getLocale());
    }
    if (!finalCell) {
      return { value: "" };
    }
    if (finalCell.value === null) {
      return { value: _t("(Undefined)") };
    }
    return {
      value: finalCell.value,
      format: finalCell.format,
    };
  }

  getPivotCellValueAndFormat(measureId: string, domain: PivotDomain): FunctionResultObject {
    const dataEntries = this.filterDataEntriesFromDomain(this.dataEntries, domain);
    if (dataEntries.length === 0) {
      return { value: "" };
    }
    const measure = this.getMeasure(measureId);
    const allValues = dataEntries.map((value) => value[measure.fieldName]).filter(isDefined);
    const values = allValues.filter((cell) => cell.type !== CellValueType.empty);
    const aggregator = measure.aggregator;
    const operator = AGGREGATORS_FN[aggregator];
    if (!operator) {
      throw new Error(`Aggregator ${aggregator} does not exist`);
    }

    try {
      const result = operator([allValues], this.getters.getLocale());
      if (values.length === 0) {
        return { ...result, value: "" };
      }
      return result;
    } catch (e) {
      return handleError(e, aggregator.toUpperCase());
    }
  }

  getPossibleFieldValues(
    dimension: PivotDimension
  ): { value: string | number | boolean; label: string }[] {
    const values: { value: string | number | boolean; label: string }[] = [];
    for (const value in groupPivotDataEntriesBy(this.dataEntries, dimension)) {
      values.push({ value, label: "" });
    }
    return values;
  }

  getTableStructure(): SpreadsheetPivotTable {
    if (!this.isValid()) {
      throw new Error("Pivot is not valid !");
    }
    if (!this.table) {
      this.table = dataEntriesToSpreadsheetPivotTable(this.dataEntries, this.definition);
    }
    return this.table;
  }

  getFields(): PivotFields {
    return this.fields;
  }

  private getTypeOfDimension(fieldWithGranularity: string): string {
    if (fieldWithGranularity === "measure") {
      return "char";
    }
    const { fieldName } = parseDimension(fieldWithGranularity);
    const type = this.fields[fieldName]?.type;
    if (!type) {
      throw new Error(`Field ${fieldName} does not exist`);
    }
    return type;
  }

  private filterDataEntriesFromDomain(dataEntries: DataEntries, domain: PivotNode[]) {
    return domain.reduce(
      (current, acc) => this.filterDataEntriesFromDomainNode(current, acc),
      dataEntries
    );
  }

  private filterDataEntriesFromDomainNode(dataEntries: DataEntries, domain: PivotNode) {
    const { field, value } = domain;
    const { nameWithGranularity } = this.getDimension(field);
    return dataEntries.filter((entry) => entry[nameWithGranularity]?.value === value);
  }

  private getDimension(nameWithGranularity: string): PivotDimension {
    return this.definition.getDimension(nameWithGranularity);
  }

  private getTypeFromZone(sheetId: UID, zone: Zone) {
    const cells = this.getters.getEvaluatedCellsInZone(sheetId, zone);
    const nonEmptyCells = cells.filter((cell) => cell.type !== CellValueType.empty);
    if (nonEmptyCells.length === 0) {
      return "integer";
    }
    if (nonEmptyCells.every((cell) => cell.format && isDateTimeFormat(cell.format))) {
      return "date";
    }
    if (nonEmptyCells.every((cell) => cell.type === CellValueType.boolean)) {
      return "boolean";
    }
    if (nonEmptyCells.some((cell) => cell.type === CellValueType.text)) {
      return "char";
    }
    return "integer";
  }

  private assertCellIsValidField(col: number, row: number, cell: EvaluatedCell) {
    if (cell.type === CellValueType.error) {
      throw new EvaluationError(
        _t("The pivot cannot be created because cell %s contains an error", toXC(col, row))
      );
    }
    if (cell.type === CellValueType.empty || cell.value === "") {
      throw new EvaluationError(
        _t("The pivot cannot be created because cell %s is empty", toXC(col, row))
      );
    }

    if (cell.value === "__count") {
      throw new EvaluationError(
        _t("The pivot cannot be created because cell %s contains a reserved value", toXC(col, row))
      );
    }
  }

  /**
   * Create the fields from the given range. It will extract all the fields from
   * the first row of the range.
   */
  private extractFieldsFromRange(range: Range) {
    const fields: PivotFields = {};
    const fieldKeys: TechnicalName[] = [];
    const sheetId = range.sheetId;
    const row = range.zone.top;
    for (let col = range.zone.left; col <= range.zone.right; col++) {
      const cell = this.getters.getEvaluatedCell({ sheetId, col, row });
      this.assertCellIsValidField(col, row, cell);
      const field = cell.value?.toString();
      if (field) {
        const type = this.getTypeFromZone(sheetId, {
          top: range.zone.top + 1,
          left: col,
          bottom: range.zone.bottom,
          right: col,
        });
        const string = this.findName(field, fields);
        fields[string] = {
          name: string,
          type,
          string,
          aggregator: type === "integer" ? "sum" : "count",
        };
        fieldKeys.push(string);
      }
    }
    return { fields, fieldKeys };
  }

  /**
   * Take cares of double names
   */
  private findName(name: string, fields: PivotFields) {
    let increment = 1;
    const initialName = name;
    while (name in fields) {
      name = `${initialName}${++increment}`;
    }
    return name;
  }

  private extractDataEntriesFromRange(range: Range): DataEntries {
    const dataEntries: DataEntries = [];

    for (let row = range.zone.top + 1; row <= range.zone.bottom; row++) {
      const zone = { top: row, bottom: row, left: range.zone.left, right: range.zone.right };
      const cells = this.getters.getEvaluatedCellsInZone(range.sheetId, zone);
      const entry: DataEntry = {};
      for (const index in cells) {
        const cell = cells[index];
        const field = this.fields[this.fieldKeys[index]];
        if (!field) {
          throw new Error(`Field ${this.fieldKeys[index]} does not exist`);
        }
        if (cell.value === "") {
          entry[field.name] = { value: null, type: CellValueType.empty };
        } else {
          entry[field.name] = cell;
        }
      }
      entry["__count"] = { value: 1, type: CellValueType.number };
      dataEntries.push(entry);
    }
    const dateDimensions = this.definition.columns
      .concat(this.definition.rows)
      .filter((d) => d.type === "date");
    if (dateDimensions.length) {
      for (const entry of dataEntries) {
        for (const dimension of dateDimensions) {
          entry[dimension.nameWithGranularity] = {
            value: createDate(
              dimension,
              entry[dimension.fieldName]?.value || null,
              this.getters.getLocale()
            ),
            type: entry[dimension.fieldName]?.type || CellValueType.empty,
            format: entry[dimension.fieldName]?.format,
          };
        }
      }
    }
    return dataEntries;
  }
}
