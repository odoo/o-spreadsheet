import { _t } from "../../translation";
import { EvaluationError } from "../../types/errors";
import {
  CommonPivotCoreDefinition,
  PivotCoreDimension,
  PivotCoreMeasure,
  PivotDimension,
  PivotFields,
  PivotMeasure,
} from "../../types/pivot";
import { isDateField } from "./pivot_helpers";

/**
 * Represent a pivot runtime definition. A pivot runtime definition is a pivot
 * definition that has been enriched to include the display name of its attributes
 * (measures, columns, rows).
 */
export class PivotRuntimeDefinition {
  readonly measures: PivotMeasure[];
  readonly columns: PivotDimension[];
  readonly rows: PivotDimension[];

  constructor(definition: CommonPivotCoreDefinition, fields: PivotFields) {
    this.measures = definition.measures.map((measure) => createMeasure(fields, measure));
    this.columns = definition.columns.map((dimension) => createPivotDimension(fields, dimension));
    this.rows = definition.rows.map((dimension) => createPivotDimension(fields, dimension));
  }

  getDimension(nameWithGranularity: string): PivotDimension {
    const dimension =
      this.columns.find((d) => d.nameWithGranularity === nameWithGranularity) ||
      this.rows.find((d) => d.nameWithGranularity === nameWithGranularity);
    if (!dimension) {
      throw new EvaluationError(_t("Dimension %s does not exist", nameWithGranularity));
    }
    return dimension;
  }

  getMeasure(name: string): PivotMeasure {
    const measure = this.measures.find((measure) => measure.name === name);
    if (!measure) {
      throw new EvaluationError(_t("Field %s does not exist", name));
    }
    return measure;
  }
}

function createMeasure(fields: PivotFields, measure: PivotCoreMeasure): PivotMeasure {
  const name = measure.name;
  const field =
    name === "__count"
      ? { name: "__count", string: _t("Count"), type: "integer", aggregator: "sum" }
      : fields[name];
  const aggregator = measure.aggregator;
  return {
    nameWithAggregator: name + (aggregator ? `:${aggregator}` : ""),
    /**
     * Display name of the measure
     * e.g. "__count" -> "Count", "amount_total" -> "Total Amount"
     */
    displayName: field?.string ?? name,
    /**
     * Get the name of the measure, as it is stored in the pivot formula
     */
    name,
    /**
     * Get the aggregator of the measure
     */
    aggregator,
    /**
     * Get the type of the measure field
     * e.g. "stage_id" -> "many2one", "create_date:month" -> "date"
     */
    type: name === "__count" ? "integer" : field?.type ?? "integer",
    isValid: !!field,
  };
}

function createPivotDimension(fields: PivotFields, dimension: PivotCoreDimension): PivotDimension {
  const field = fields[dimension.name];
  const type = field?.type ?? "integer";
  const granularity = field && isDateField(field) ? dimension.granularity : undefined;

  return {
    /**
     * Get the display name of the dimension
     * e.g. "stage_id" -> "Stage", "create_date:month" -> "Create Date"
     */
    displayName: field?.string ?? dimension.name,

    /**
     * Get the name of the dimension, as it is stored in the pivot formula
     * e.g. "stage_id", "create_date:month"
     */
    nameWithGranularity: dimension.name + (granularity ? `:${granularity}` : ""),

    /**
     * Get the name of the field of the dimension
     * e.g. "stage_id" -> "stage_id", "create_date:month" -> "create_date"
     */
    name: dimension.name,

    /**
     * Get the aggregate operator of the dimension
     * e.g. "stage_id" -> undefined, "create_date:month" -> "month"
     */
    granularity,

    /**
     * Get the type of the field of the dimension
     * e.g. "stage_id" -> "many2one", "create_date:month" -> "date"
     */
    type,

    order: dimension.order,

    isValid: !!field,
  };
}
