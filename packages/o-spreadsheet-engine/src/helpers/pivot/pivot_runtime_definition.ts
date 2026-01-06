import { _t } from "../../translation";
import { EvaluationError } from "../../types/errors";
import {
  CommonPivotCoreDefinition,
  PivotCollapsedDomains,
  PivotCoreDimension,
  PivotCoreMeasure,
  PivotCustomGroupedField,
  PivotDimension,
  PivotFields,
  PivotMeasure,
  PivotSortedColumn,
} from "../../types/pivot";
import { isDateOrDatetimeField } from "./pivot_helpers";

/**
 * Represent a pivot runtime definition. A pivot runtime definition is a pivot
 * definition that has been enriched to include the display name of its attributes
 * (measures, columns, rows).
 */
export class PivotRuntimeDefinition {
  readonly measures: PivotMeasure[];
  readonly columns: PivotDimension[];
  readonly rows: PivotDimension[];
  readonly sortedColumn?: PivotSortedColumn;
  readonly collapsedDomains?: PivotCollapsedDomains;
  readonly customFields?: Record<string, PivotCustomGroupedField>;

  constructor(definition: CommonPivotCoreDefinition, fields: PivotFields) {
    this.columns = definition.columns.map((dimension) =>
      this.createPivotDimension(fields, dimension)
    );
    this.rows = definition.rows.map((dimension) => this.createPivotDimension(fields, dimension));
    this.measures = definition.measures.map((measure) => this.createMeasure(fields, measure));
    this.sortedColumn = definition.sortedColumn;
    this.collapsedDomains = definition.collapsedDomains;
    this.customFields = definition.customFields;
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

  getMeasure(id: string): PivotMeasure {
    const measure = this.measures.find((measure) => measure.id === id);
    if (!measure) {
      throw new EvaluationError(_t("Field %s is not a measure", id));
    }
    return measure;
  }

  get invalidAggregatorsForCustomField(): string[] {
    return [];
  }

  private createMeasure(fields: PivotFields, measure: PivotCoreMeasure): PivotMeasure {
    const fieldName = measure.fieldName;
    const field =
      fieldName === "__count"
        ? { name: "__count", string: _t("Count"), type: "integer", aggregator: "sum" }
        : fields[fieldName];
    const aggregator = measure.aggregator;

    let isValid = !!(field || measure.computedBy);
    for (const dimension of [...this.rows, ...this.columns]) {
      const field = fields[dimension.fieldName];
      if (field?.isCustomField && this.invalidAggregatorsForCustomField.includes(aggregator)) {
        isValid = false;
        break;
      }
    }

    return {
      /**
       * Get the id of the measure, as it is stored in the pivot formula
       */
      id: measure.id,
      /**
       * Display name of the measure
       * e.g. "__count" -> "Count", "amount_total" -> "Total Amount"
       */
      get displayName() {
        return measure.userDefinedName ?? field?.string ?? measure.fieldName;
      },
      userDefinedName: measure.userDefinedName,
      /**
       * Get the name of the field of the measure
       */
      fieldName,
      /**
       * Get the aggregator of the measure
       */
      aggregator,
      /**
       * Get the type of the measure field
       * e.g. "stage_id" -> "many2one", "create_date:month" -> "date"
       */
      type: fieldName === "__count" ? "integer" : field?.type ?? "integer",
      isValid,
      isHidden: measure.isHidden,
      format: measure.format,
      computedBy: measure.computedBy,
      display: measure.display,
    };
  }

  private createPivotDimension(fields: PivotFields, dimension: PivotCoreDimension): PivotDimension {
    const field = fields[dimension.fieldName];
    const type = field?.type ?? "integer";
    const granularity = field && isDateOrDatetimeField(field) ? dimension.granularity : undefined;

    return {
      /**
       * Get the display name of the dimension
       * e.g. "stage_id" -> "Stage", "create_date:month" -> "Create Date"
       */
      displayName: field?.string ?? dimension.fieldName,

      /**
       * Get the name of the dimension, as it is stored in the pivot formula
       * e.g. "stage_id", "create_date:month"
       */
      nameWithGranularity: dimension.fieldName + (granularity ? `:${granularity}` : ""),

      /**
       * Get the name of the field of the dimension
       * e.g. "stage_id" -> "stage_id", "create_date:month" -> "create_date"
       */
      fieldName: dimension.fieldName,

      /**
       * Get the aggregate operator of the dimension
       * e.g. "stage_id" -> undefined, "create_date:month" -> "month"
       */
      granularity,

      /**
       * Get the type of the field of the dimension
       * e.g. "stage_id" -> "many2one", "create_date:month" -> "date"
       */
      type: field?.isCustomField ? "custom" : type,

      order: dimension.order,

      isValid: !!field,
      isCustomField: !!field?.isCustomField,
      customGroups: field?.customGroups,
      parentField: field?.parentField,
      isHidden: dimension.isHidden,
    };
  }
}
