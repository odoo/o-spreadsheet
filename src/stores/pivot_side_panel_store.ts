import { deepCopy, deepEquals } from "../helpers";
import { MEASURES_TYPES } from "../helpers/pivot/pivot_helpers";
import { pivotRegistry } from "../helpers/pivot/pivot_registry";
import { Get } from "../store_engine";
import { _t } from "../translation";
import { UID } from "../types";
import {
  PivotCoreDefinition,
  PivotDimension,
  PivotField,
  PivotFields,
  PivotMeasure,
} from "../types/pivot";
import { SpreadsheetStore } from "./spreadsheet_store";

export class PivotSidePanelStore extends SpreadsheetStore {
  private updatesAreDeferred: boolean = true;
  private draft: PivotCoreDefinition | null = null;
  constructor(get: Get, private pivotId: UID) {
    super(get);
  }

  get fields() {
    const fields = this.pivot.getFields();
    if (!fields) {
      throw new Error("Fields not found");
    }
    return fields;
  }

  get pivot() {
    return this.getters.getPivot(this.pivotId);
  }

  get definition() {
    const type = this.getters.getPivotCoreDefinition(this.pivotId).type;
    const cls = pivotRegistry.get(type).definition;
    return this.draft ? new cls(this.draft, this.fields) : this.pivot.definition;
  }

  get isDirty() {
    return !!this.draft;
  }

  get unusedMeasureFields() {
    const measureFields: PivotField[] = [
      {
        name: "__count",
        string: _t("Count"),
        type: "integer",
        aggregator: "sum",
      },
    ];
    const fields = this.fields;
    for (const fieldName in fields) {
      const field = fields[fieldName];
      if (!field) {
        continue;
      }
      if (
        ((MEASURES_TYPES.includes(field.type) && field.aggregator) || field.type === "many2one") &&
        field.name !== "id" &&
        field.store
      ) {
        measureFields.push(field);
      }
    }
    const { rows, columns, measures } = this.definition;
    const currentlyUsed = (measures as (PivotMeasure | PivotDimension)[])
      .concat(rows)
      .concat(columns)
      .map((field) => field.name);
    return measureFields
      .filter((field) => !currentlyUsed.includes(field.name))
      .sort((a, b) => a.string.localeCompare(b.string));
  }

  get unusedGroupableFields() {
    const groupableFields: PivotField[] = [];
    const fields = this.fields;
    for (const fieldName in fields) {
      const field = fields[fieldName];
      if (!field) {
        continue;
      }
      if (field.groupable) {
        groupableFields.push(field);
      }
    }
    const { columns, rows, measures } = this.definition;
    const currentlyUsed = (measures as (PivotMeasure | PivotDimension)[])
      .concat(rows)
      .concat(columns)
      .map((field) => field.name);
    const unusedDateTimeGranularities = this.unusedDateTimeGranularities;
    return groupableFields
      .filter((field) => {
        if (field.type === "date" || field.type === "datetime") {
          return (
            !currentlyUsed.includes(field.name) || unusedDateTimeGranularities[field.name].size > 0
          );
        }
        return !currentlyUsed.includes(field.name);
      })
      .sort((a, b) => a.string.localeCompare(b.string));
  }

  get unusedDateTimeGranularities() {
    return this.getUnusedDateTimeGranularities(
      this.fields,
      this.draft ?? this.getters.getPivotCoreDefinition(this.pivotId)
    );
  }

  reset(pivotId: UID) {
    this.pivotId = pivotId;
    this.updatesAreDeferred = true;
    this.draft = null;
  }

  deferUpdates(shouldDefer: boolean) {
    this.updatesAreDeferred = shouldDefer;
    if (shouldDefer === false && this.draft) {
      this.applyUpdate();
    }
  }

  applyUpdate() {
    if (this.draft) {
      this.model.dispatch("UPDATE_PIVOT", {
        pivotId: this.pivotId,
        pivot: this.draft,
      });
      this.draft = null;
    }
  }

  discardPendingUpdate() {
    this.draft = null;
  }

  update(definitionUpdate: Partial<PivotCoreDefinition>) {
    const coreDefinition = this.getters.getPivotCoreDefinition(this.pivotId);
    const definition = { ...coreDefinition, ...this.draft, ...definitionUpdate };
    // clean to make sure we only keep the core properties
    const cleanedDefinition = {
      ...definition,
      columns: definition.columns.map((col) => ({
        name: col.name,
        order: col.order,
        granularity: col.granularity,
      })),
      rows: definition.rows.map((row) => ({
        name: row.name,
        order: row.order,
        granularity: row.granularity,
      })),
      measures: definition.measures.map((measure) => ({
        name: measure.name,
        aggregator: measure.aggregator,
      })),
    };
    if (!this.draft && deepEquals(coreDefinition, cleanedDefinition)) {
      return;
    }
    const cleanedWithGranularity = this.addDefaultDateTimeGranularity(
      this.fields,
      cleanedDefinition
    );
    if (this.updatesAreDeferred) {
      this.draft = cleanedWithGranularity;
    } else {
      this.model.dispatch("UPDATE_PIVOT", {
        pivotId: this.pivotId,
        pivot: cleanedWithGranularity,
      });
    }
  }

  private addDefaultDateTimeGranularity(fields: PivotFields, definition: PivotCoreDefinition) {
    const { columns, rows } = definition;
    const columnsWithGranularity = deepCopy(columns);
    const rowsWithGranularity = deepCopy(rows);
    const unusedGranularities = this.getUnusedDateTimeGranularities(fields, definition);
    for (const dimension of columnsWithGranularity.concat(rowsWithGranularity)) {
      const fieldType = fields[dimension.name]?.type;
      if ((fieldType === "date" || fieldType === "datetime") && !dimension.granularity) {
        const granularity = unusedGranularities[dimension.name]?.values().next().value || "year";
        unusedGranularities[dimension.name]?.delete(granularity);
        dimension.granularity = granularity;
      }
    }
    return {
      ...definition,
      columns: columnsWithGranularity,
      rows: rowsWithGranularity,
    };
  }

  private getUnusedDateTimeGranularities(fields: PivotFields, definition: PivotCoreDefinition) {
    const { columns, rows } = definition;
    const dateFields = columns.concat(rows).filter((dimension) => {
      const fieldType = fields[dimension.name]?.type;
      return fieldType === "date" || fieldType === "datetime";
    });
    const granularities = ["year", "quarter", "month", "week", "day"];
    const granularitiesPerFields = {};
    for (const field of dateFields) {
      granularitiesPerFields[field.name] = new Set(granularities);
    }
    for (const field of dateFields) {
      granularitiesPerFields[field.name].delete(field.granularity);
    }
    return granularitiesPerFields;
  }
}
