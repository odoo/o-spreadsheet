import { toString } from "../../../functions/helpers";
import { ModelConfig } from "../../../model";
import { _t } from "../../../translation";
import { FunctionResultObject, Maybe } from "../../../types";
import { CellErrorType, EvaluationError } from "../../../types/errors";
import {
  PivotDimension,
  PivotDomain,
  PivotFields,
  PivotMeasure,
  SpreadsheetPivotCoreDefinition,
} from "../../../types/pivot";
import { InitPivotParams, Pivot } from "../../../types/pivot_runtime";
import { areDomainArgsFieldsValid, parseDimension, toNormalizedPivotValue } from "../pivot_helpers";
import { PivotPostProcessLayer } from "../pivot_post_process_layer";
import { PivotParams } from "../pivot_registry";
import { SpreadsheetPivotTable } from "../table_spreadsheet_pivot";
import { SpreadsheetPivotRuntimeDefinition } from "./runtime_definition_spreadsheet_pivot";
import { SpreadsheetPivotDataLayer } from "./spreadsheet_pivot_data_layer";

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
  private dataLayer: SpreadsheetPivotDataLayer;
  private postProcessLayer: PivotPostProcessLayer;

  constructor(custom: ModelConfig["custom"], params: SpreadsheetPivotParams) {
    this.dataLayer = new SpreadsheetPivotDataLayer(custom, params);
    this.postProcessLayer = new PivotPostProcessLayer(this.dataLayer);
  }

  init(params: InitPivotParams = {}) {
    // here goes reset stuff for "show as value" cache
    this.dataLayer.init(params);
  }

  get isInvalidRange() {
    return !!this.dataLayer.invalidRangeError;
  }

  get invalidRangeMessage() {
    return this.dataLayer.invalidRangeError?.message;
  }

  get definition() {
    return this.dataLayer.definition;
  }

  isValid(): boolean {
    return this.dataLayer.isValid();
  }

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FunctionResultObject | undefined {
    if (!this.isValid()) {
      if (throwOnError) {
        if (this.dataLayer.invalidRangeError) {
          throw this.dataLayer.invalidRangeError;
        } else {
          throw new EvaluationError(_t("At least one measure and/or dimension is not correct."));
        }
      }
      return {
        value: CellErrorType.GenericError,
        message:
          this.invalidRangeMessage ?? _t("At least one measure and/or dimension is not correct."),
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
          : toNormalizedPivotValue(this.definition.getDimension(fieldWithGranularity), args[i + 1]);
      domain.push({ field: fieldWithGranularity, value: normalizedValue, type });
    }
    return domain;
  }

  markAsDirtyForEvaluation(): void {
    this.dataLayer.markAsDirtyForEvaluation();
  }

  // duplicated
  getMeasure(name: string): PivotMeasure {
    return this.definition.getMeasure(name);
  }

  // common
  getPivotMeasureValue(name: string): FunctionResultObject {
    return {
      value: this.getMeasure(name).displayName,
    };
  }

  getPivotHeaderValueAndFormat(domain: PivotDomain): FunctionResultObject {
    return this.dataLayer.getPivotHeaderValueAndFormat(domain);
  }

  getPivotCellValueAndFormat(measure: string, domain: PivotDomain): FunctionResultObject {
    return this.postProcessLayer.getPivotCellValueAndFormat(measure, domain);
  }

  getPossibleFieldValues(
    dimension: PivotDimension
  ): { value: string | number | boolean; label: string }[] {
    return this.dataLayer.getPossibleFieldValues(dimension);
  }

  getTableStructure(): SpreadsheetPivotTable {
    return this.dataLayer.getTableStructure();
  }

  getFields(): PivotFields {
    return this.dataLayer.getFields();
  }

  private getTypeOfDimension(fieldWithGranularity: string): string {
    if (fieldWithGranularity === "measure") {
      return "char";
    }
    const { name } = parseDimension(fieldWithGranularity);
    const type = this.getFields()[name]?.type;
    if (!type) {
      throw new Error(`Field ${name} does not exist`);
    }
    return type;
  }
}
