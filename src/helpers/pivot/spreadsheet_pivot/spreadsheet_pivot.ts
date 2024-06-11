import { handleError } from "../../../functions";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import { CellValueType, EvaluatedCell, FPayload, Getters, Range, UID, Zone } from "../../../types";
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
import { isDateTimeFormat } from "../../format";
import { isDefined } from "../../misc";
import { AGGREGATORS_FN, toNormalizedPivotValue } from "../pivot_helpers";
import { PivotParams } from "../pivot_registry";
import { pivotTimeAdapter } from "../pivot_time_adapter";
import {
  DataEntries,
  DataEntry,
  dataEntriesToSpreadsheetPivotTable,
  groupPivotDataEntriesBy,
} from "./data_entry_spreadsheet_pivot";
import { createDate } from "./date_spreadsheet_pivot";
import { SpreadsheetPivotRuntimeDefinition } from "./runtime_definition_spreadsheet_pivot";
import { SpreadsheetPivotTable } from "./table_spreadsheet_pivot";

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

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FPayload | undefined {
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

  markAsDirtyForEvaluation(): void {
    this.needsReevaluation = true;
  }

  getMeasure(name: string): PivotMeasure {
    return this.definition.getMeasure(name);
  }

  getPivotMeasureValue(name: string): FPayload {
    return {
      value: this.getMeasure(name).displayName,
    };
  }

  getPivotHeaderValueAndFormat(domain: PivotDomain): FPayload {
    const lastNode = domain.at(-1);
    if (!lastNode) {
      return { value: _t("Total") };
    }
    const dimension = this.getDimension(lastNode.field);
    const cells = this.filterDataEntriesFromDomain(this.dataEntries, domain);
    const finalCell = cells[0]?.[dimension.nameWithGranularity];
    if (dimension.type === "date") {
      const adapter = pivotTimeAdapter(dimension.granularity as Granularity);
      return {
        value: adapter.toCellValue(toNormalizedPivotValue(dimension, lastNode.value)),
        format: adapter.getFormat(this.getters.getLocale()),
      };
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

  getPivotCellValueAndFormat(measure: string, domain: PivotDomain): FPayload {
    const dataEntries = this.filterDataEntriesFromDomain(this.dataEntries, domain);
    if (dataEntries.length === 0) {
      return { value: "" };
    }
    const values = dataEntries
      .map((value) => value[measure])
      .filter((cell) => cell && cell.type !== CellValueType.empty)
      .filter(isDefined);
    const aggregator = this.getMeasure(measure).aggregator || "count";
    const operator = AGGREGATORS_FN[aggregator];
    if (!operator) {
      throw new Error(`Aggregator ${aggregator} does not exist`);
    }

    try {
      return {
        value: values.length ? operator.fn([values], this.getters.getLocale()) : "",
        format: operator.format(values[0]),
      };
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

  getFields(): PivotFields | undefined {
    return this.fields;
  }

  private filterDataEntriesFromDomain(dataEntries: DataEntries, domain: PivotNode[]) {
    return domain.reduce(
      (current, acc) => this.filterDataEntriesFromDomainNode(current, acc),
      dataEntries
    );
  }

  private filterDataEntriesFromDomainNode(dataEntries: DataEntries, domain: PivotNode) {
    const { field, value } = domain;
    const dimension = this.getDimension(field);
    return dataEntries.filter(
      (entry) =>
        `${entry[dimension.nameWithGranularity]?.value}` ===
        `${toNormalizedPivotValue(dimension, value)}`
    );
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
    if (cell.type === CellValueType.empty) {
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
            value: `${createDate(
              dimension,
              entry[dimension.name]?.value || null,
              this.getters.getLocale()
            )}`,
            type: entry[dimension.name]?.type || CellValueType.empty,
            format: entry[dimension.name]?.format,
          };
        }
      }
    }
    return dataEntries;
  }
}
