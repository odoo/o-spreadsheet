import { _t } from "../../translation";
import {
  CommonPivotCoreDefinition,
  PivotCoreDimension,
  PivotCoreMeasure,
  PivotDimension,
  PivotFields,
  PivotMeasure,
} from "../../types/pivot";

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
}

function createMeasure(fields: PivotFields, measure: PivotCoreMeasure): PivotMeasure {
  const name = measure.name;
  const aggregator = measure.aggregator || fields[name]?.aggregator;
  const field =
    name === "__count" ? { name: "__count", string: _t("Count"), type: "integer" } : fields[name];
  if (!field) {
    throw new Error(`Field ${name} not found in fields`);
  }
  return {
    nameWithAggregator: name + (aggregator ? `:${aggregator}` : ""),
    /**
     * Display name of the measure
     * e.g. "__count" -> "Count", "amount_total" -> "Total Amount"
     */
    displayName: field.string,
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
    type: name === "__count" ? "integer" : field.type,
  };
}

function createPivotDimension(fields: PivotFields, dimension: PivotCoreDimension): PivotDimension {
  const field = fields[dimension.name];
  if (!field) {
    throw new Error(`Field ${name} not found in fields`);
  }
  return {
    /**
     * Get the display name of the dimension
     * e.g. "stage_id" -> "Stage", "create_date:month" -> "Create Date"
     */
    displayName: field.string,

    /**
     * Get the name of the dimension, as it is stored in the pivot formula
     * e.g. "stage_id", "create_date:month"
     */
    nameWithGranularity:
      dimension.name + (dimension.granularity ? `:${dimension.granularity}` : ""),

    /**
     * Get the name of the field of the dimension
     * e.g. "stage_id" -> "stage_id", "create_date:month" -> "create_date"
     */
    name: dimension.name,

    /**
     * Get the aggregate operator of the dimension
     * e.g. "stage_id" -> undefined, "create_date:month" -> "month"
     */
    granularity: dimension.granularity,

    /**
     * Get the type of the field of the dimension
     * e.g. "stage_id" -> "many2one", "create_date:month" -> "date"
     */
    type: field.type,

    order: dimension.order,
  };
}
