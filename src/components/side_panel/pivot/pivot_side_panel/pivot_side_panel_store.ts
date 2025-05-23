import { deepCopy, deepEquals } from "../../../../helpers";
import { getFirstPivotFunction } from "../../../../helpers/pivot/pivot_composer_helpers";
import { isDateOrDatetimeField } from "../../../../helpers/pivot/pivot_helpers";
import { pivotRegistry } from "../../../../helpers/pivot/pivot_registry";
import { Get } from "../../../../store_engine";
import { NotificationStore } from "../../../../stores/notification_store";
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
  private notification = this.get(NotificationStore);
  private alreadyNotified = false;

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

  get measureFields() {
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
    return measureFields.sort((a, b) => a.string.localeCompare(b.string));
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
    const unusedGranularities = this.unusedGranularities;
    return groupableFields
      .filter((field) => {
        if (isDateOrDatetimeField(field)) {
          return !currentlyUsed.includes(field.name) || unusedGranularities[field.name].size > 0;
        }
        return !currentlyUsed.includes(field.name);
      })
      .sort((a, b) => a.string.localeCompare(b.string));
  }

  get datetimeGranularities() {
    return pivotRegistry.get(this.pivot.type).datetimeGranularities;
  }

  get dateGranularities() {
    return pivotRegistry.get(this.pivot.type).dateGranularities;
  }

  get unusedGranularities() {
    return this.getUnusedGranularities(
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
      if (!this.alreadyNotified && this.isUpdatedPivotVisibleInViewportOnlyAsStaticPivot()) {
        const formulaId = this.getters.getPivotFormulaId(this.pivotId);
        const pivotExample = `=PIVOT(${formulaId})`;
        this.alreadyNotified = true;
        this.notification.notifyUser({
          type: "info",
          text: _t(
            "Pivot updates only work with dynamic pivot tables. Use %s or re-insert the static pivot from the Data menu.",
            pivotExample
          ),
          sticky: true,
        });
      }
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
    const cleanedDefinition: PivotCoreDefinition = {
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
        computedBy: measure.computedBy,
        isHidden: measure.isHidden,
        format: measure.format,
        display: measure.display,
      })),
    };
    if (!this.draft && deepEquals(coreDefinition, cleanedDefinition)) {
      return;
    }
    const cleanedWithGranularity = this.addDefaultDateTimeGranularity(
      this.fields,
      cleanedDefinition
    );
    this.draft = cleanedWithGranularity;
    if (!this.updatesAreDeferred) {
      this.applyUpdate();
    }
  }

  /**
   * @returns true if the updated pivot is visible in the viewport only as a
   * static pivot and not as a dynamic pivot
   */
  private isUpdatedPivotVisibleInViewportOnlyAsStaticPivot() {
    let staticPivotCount = 0;
    const updatedPivotFormulaId = this.getters.getPivotFormulaId(this.pivotId);
    for (const position of this.getters.getVisibleCellPositions()) {
      const cell = this.getters.getCell(position);
      if (cell?.isFormula) {
        const pivotFunction = getFirstPivotFunction(cell.compiledFormula.tokens);
        const pivotFormulaId = pivotFunction?.args[0]?.value;
        if (pivotFunction && updatedPivotFormulaId === pivotFormulaId.toString()) {
          if (pivotFunction.functionName === "PIVOT") {
            // if we have at least one dynamic pivot visible inserted the viewport
            // we return false
            return false;
          } else {
            staticPivotCount++;
          }
        }
      }
    }
    // we return true if there are only static pivots visible inserted the viewport,
    // otherwise false
    return staticPivotCount > 0;
  }

  private addDefaultDateTimeGranularity(fields: PivotFields, definition: PivotCoreDefinition) {
    const { columns, rows } = definition;
    const columnsWithGranularity = deepCopy(columns);
    const rowsWithGranularity = deepCopy(rows);
    const unusedGranularities = this.getUnusedGranularities(fields, definition);
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

  private getUnusedGranularities(
    fields: PivotFields,
    definition: PivotCoreDefinition
  ): Record<string, Set<string>> {
    const { columns, rows } = definition;
    const dateFields = columns.concat(rows).filter((dimension) => {
      const fieldType = fields[dimension.fieldName]?.type;
      return fieldType === "date" || fieldType === "datetime";
    });
    const granularitiesPerFields = {};
    for (const field of dateFields) {
      granularitiesPerFields[field.fieldName] = new Set(
        fields[field.fieldName]?.type === "date"
          ? this.dateGranularities
          : this.datetimeGranularities
      );
    }
    for (const field of dateFields) {
      granularitiesPerFields[field.fieldName].delete(field.granularity || "month");
    }
    return granularitiesPerFields;
  }
}
