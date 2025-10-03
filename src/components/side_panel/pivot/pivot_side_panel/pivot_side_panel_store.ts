import { PIVOT_MAX_NUMBER_OF_CELLS } from "../../../../constants";
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
  PivotCoreDimension,
  PivotCoreMeasure,
  PivotDimension,
  PivotDomain,
  PivotField,
  PivotFields,
  PivotMeasure,
} from "../../../../types/pivot";
import { getPivotTooBigErrorMessage } from "../../../translations_terms";

export class PivotSidePanelStore extends SpreadsheetStore {
  mutators = ["reset", "deferUpdates", "applyUpdate", "discardPendingUpdate", "update"] as const;

  private updatesAreDeferred: boolean;
  private draft: PivotCoreDefinition | null = null;
  private notification = this.get(NotificationStore);
  private alreadyNotified = false;
  private alreadyNotifiedForPivotSize = false;

  constructor(get: Get, private pivotId: UID) {
    super(get);
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
      if (!this.alreadyNotified && this.isUpdatedPivotVisibleInViewportOnlyAsStaticPivot()) {
        const formulaId = this.getters.getPivotFormulaId(this.pivotId);
        const pivotExample = `=PIVOT(${formulaId})`;
        this.alreadyNotified = true;
        this.notification.notifyUser({
          type: "info",
          text: _t(
            "Pivot updates only work with dynamic pivot tables. Use the formula '%s' or re-insert the static pivot from the Data menu.",
            pivotExample
          ),
          sticky: true,
        });
      }

      const pivot = this.getters.getPivot(this.pivotId);
      const numberOfCells = pivot.isValid() ? pivot.getExpandedTableStructure().numberOfCells : 0;
      if (!this.alreadyNotifiedForPivotSize && numberOfCells > PIVOT_MAX_NUMBER_OF_CELLS) {
        this.alreadyNotifiedForPivotSize = true;
        this.notification.notifyUser({
          type: "warning",
          text: getPivotTooBigErrorMessage(numberOfCells, this.getters.getLocale()),
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
      sortedColumn: this.shouldKeepSortedColumn(definition) ? definition.sortedColumn : undefined,
    };
    if (cleanedDefinition.collapsedDomains) {
      const { COL, ROW } = cleanedDefinition.collapsedDomains;
      cleanedDefinition.collapsedDomains = {
        COL: COL.filter((domain) => this.areDomainFieldsValid(domain, cleanedDefinition.columns)),
        ROW: ROW.filter((domain) => this.areDomainFieldsValid(domain, cleanedDefinition.rows)),
      };
    }

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
        const pivotArg = pivotFunction?.args[0];
        const pivotFormulaId =
          pivotArg && (pivotArg.type === "STRING" || pivotArg.type === "NUMBER")
            ? pivotArg.value
            : undefined;
        if (
          pivotFunction &&
          pivotFormulaId !== undefined &&
          updatedPivotFormulaId === pivotFormulaId.toString()
        ) {
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
    const { columns, rows, measures } = definition;
    const dateFields = columns
      .concat(rows)
      .concat(measures)
      .filter((dimension) => {
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

  /**
   * Check if we want to keep the sorted column when updating the pivot definition. We should remove it if either
   * the measure is not in the new definition or the columns have changed.
   */
  private shouldKeepSortedColumn(newDefinition: PivotCoreDefinition) {
    const { sortedColumn } = newDefinition;
    if (!sortedColumn) {
      return true;
    }
    const oldDefinition = this.getters.getPivotCoreDefinition(this.pivotId);
    return (
      newDefinition.measures.find((measure) => measure.id === sortedColumn.measure) &&
      deepEquals(oldDefinition.columns, newDefinition.columns)
    );
  }

  private areDomainFieldsValid(domain: PivotDomain, dims: PivotCoreDimension[]) {
    const fieldsNameWithGranularity = dims.map(
      ({ fieldName, granularity }) => fieldName + (granularity ? `:${granularity}` : "")
    );
    for (let i = 0; i < domain.length; i++) {
      if (domain[i].field !== fieldsNameWithGranularity[i]) {
        return false;
      }
    }
    return true;
  }
}
