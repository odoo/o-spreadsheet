import { deepCopy, deepEquals } from "../../../../helpers";
import { isDateField } from "../../../../helpers/pivot/pivot_helpers";
import { pivotRegistry } from "../../../../helpers/pivot/pivot_registry";
import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores/spreadsheet_store";
import { _t } from "../../../../translation";
import { Command, UID } from "../../../../types";
import {
  PivotCoreDefinition,
  PivotCoreMeasure,
  PivotDimension,
  PivotField,
  PivotFields,
  PivotMeasure,
} from "../../../../types/pivot";

export class PivotSidePanelStore extends SpreadsheetStore {
  mutators = ["reset", "deferUpdates", "applyUpdate", "discardPendingUpdate", "update"] as const;

  private updatesAreDeferred: boolean = false;
  private draft: PivotCoreDefinition | null = null;
  constructor(get: Get, private pivotId: UID) {
    super(get);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_PIVOT":
        if (cmd.pivotId === this.pivotId) {
          this.getters.getPivot(this.pivotId).init();
        }
    }
  }

  get fields() {
    return this.pivot.getFields();
  }

  get pivot() {
    return this.getters.getPivot(this.pivotId);
  }

  get definition() {
    const Definition = pivotRegistry.get(this.pivot.type).definition;
    return this.draft
      ? new Definition(this.draft, this.fields, this.getters)
      : this.pivot.definition;
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
      if (pivotRegistry.get(this.pivot.type).isMeasureCandidate(field)) {
        measureFields.push(field);
      }
    }
    const { rows, columns, measures } = this.definition;
    const currentlyUsed = (measures as (PivotMeasure | PivotDimension)[])
      .concat(rows)
      .concat(columns)
      .map((field) => field.fieldName);
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
      if (pivotRegistry.get(this.pivot.type).isGroupable(field)) {
        groupableFields.push(field);
      }
    }
    const { columns, rows, measures } = this.definition;
    const currentlyUsed = (measures as (PivotMeasure | PivotDimension)[])
      .concat(rows)
      .concat(columns)
      .map((field) => field.fieldName);
    const unusedDateTimeGranularities = this.unusedDateTimeGranularities;
    return groupableFields
      .filter((field) => {
        if (isDateField(field)) {
          return (
            !currentlyUsed.includes(field.name) || unusedDateTimeGranularities[field.name].size > 0
          );
        }
        return !currentlyUsed.includes(field.name);
      })
      .sort((a, b) => a.string.localeCompare(b.string));
  }

  get allGranularities() {
    return pivotRegistry.get(this.pivot.type).granularities;
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
    const definition: PivotCoreDefinition = {
      ...coreDefinition,
      ...this.draft,
      ...definitionUpdate,
    };
    // clean to make sure we only keep the core properties
    const cleanedDefinition = {
      ...definition,
      columns: definition.columns.map((col) => ({
        fieldName: col.fieldName,
        order: col.order,
        granularity: col.granularity,
      })),
      rows: definition.rows.map((row) => ({
        fieldName: row.fieldName,
        order: row.order,
        granularity: row.granularity,
      })),
      measures: definition.measures.map((measure: PivotCoreMeasure) => ({
        id: measure.id,
        fieldName: measure.fieldName,
        aggregator: measure.aggregator,
        userDefinedName: measure.userDefinedName,
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
      const fieldType = fields[dimension.fieldName]?.type;
      if ((fieldType === "date" || fieldType === "datetime") && !dimension.granularity) {
        const granularity =
          unusedGranularities[dimension.fieldName]?.values().next().value || "year";
        unusedGranularities[dimension.fieldName]?.delete(granularity);
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
      const fieldType = fields[dimension.fieldName]?.type;
      return fieldType === "date" || fieldType === "datetime";
    });
    const granularities = this.allGranularities;
    const granularitiesPerFields = {};
    for (const field of dateFields) {
      granularitiesPerFields[field.fieldName] = new Set(granularities);
    }
    for (const field of dateFields) {
      granularitiesPerFields[field.fieldName].delete(field.granularity);
    }
    return granularitiesPerFields;
  }
}
