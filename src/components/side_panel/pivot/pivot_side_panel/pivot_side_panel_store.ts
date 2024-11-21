import { deepEquals } from "../../../../helpers";
import { GroupableFields } from "../../../../helpers/pivot/groupable_fields";
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
  PivotMeasure,
} from "../../../../types/pivot";

export class PivotSidePanelStore extends SpreadsheetStore {
  mutators = ["reset", "deferUpdates", "applyUpdate", "discardPendingUpdate", "update"] as const;

  private updatesAreDeferred: boolean;
  private draft: PivotCoreDefinition | null = null;
  private notification = this.get(NotificationStore);
  private alreadyNotified = false;
  private groupableFields: GroupableFields;

  constructor(get: Get, private pivotId: UID) {
    super(get);
    this.groupableFields = new GroupableFields(
      this.dateGranularities,
      this.datetimeGranularities,
      pivotRegistry.get(this.pivot.type).isGroupable
    );
    this.updatesAreDeferred =
      this.getters.getPivotCoreDefinition(this.pivotId).deferUpdates ?? false;
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
    const { columns, rows, measures } = this.definition;
    const dimensions = (measures as (PivotMeasure | PivotDimension)[]).concat(rows).concat(columns);
    return this.groupableFields.getUnusedGroupableFields(this.fields, dimensions);
  }

  get datetimeGranularities() {
    return pivotRegistry.get(this.pivot.type).datetimeGranularities;
  }

  get dateGranularities() {
    return pivotRegistry.get(this.pivot.type).dateGranularities;
  }

  get unusedGranularities() {
    return this.getUnusedGranularities(
      this.draft ?? this.getters.getPivotCoreDefinition(this.pivotId)
    );
  }

  reset(pivotId: UID) {
    this.pivotId = pivotId;
    this.updatesAreDeferred = true;
    this.draft = null;
  }

  deferUpdates(shouldDefer: boolean) {
    if (shouldDefer === false && this.draft) {
      this.draft.deferUpdates = false;
      this.applyUpdate();
    } else {
      this.update({ deferUpdates: shouldDefer });
    }
    this.updatesAreDeferred = shouldDefer;
  }

  applyUpdate() {
    if (this.draft) {
      this.model.dispatch("UPDATE_PIVOT", {
        pivotId: this.pivotId,
        pivot: this.draft,
      });
      this.draft = null;
      if (!this.alreadyNotified && !this.isDynamicPivotInViewport()) {
        const formulaId = this.getters.getPivotFormulaId(this.pivotId);
        const pivotExample = `=PIVOT(${formulaId})`;
        this.alreadyNotified = true;
        this.notification.notifyUser({
          type: "info",
          text: _t(
            "Pivot updates only work with dynamic pivot tables. Use %s or re-insert the static pivot from the Data menu.",
            pivotExample
          ),
          sticky: false,
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
    const cleanedWithGranularity = this.addDefaultDateTimeGranularity(cleanedDefinition);
    this.draft = cleanedWithGranularity;
    if (!this.updatesAreDeferred) {
      this.applyUpdate();
    }
  }

  private isDynamicPivotInViewport() {
    const sheetId = this.getters.getActiveSheetId();
    for (const col of this.getters.getSheetViewVisibleCols()) {
      for (const row of this.getters.getSheetViewVisibleRows()) {
        const isDynamicPivot = this.getters.isSpillPivotFormula({ sheetId, col, row });
        if (isDynamicPivot) {
          return true;
        }
      }
    }
    return false;
  }

  private addDefaultDateTimeGranularity(definition: PivotCoreDefinition) {
    const { columns, rows } = definition;
    return {
      ...definition,
      columns: this.groupableFields.addDefaultDateTimeGranularity(this.fields, columns),
      rows: this.groupableFields.addDefaultDateTimeGranularity(this.fields, rows),
    };
  }

  private getUnusedGranularities(definition: PivotCoreDefinition): Record<string, Set<string>> {
    const { columns, rows } = definition;
    return this.groupableFields.getUnusedGranularities(this.fields, columns.concat(rows));
  }
}
