import { deepCopy } from "../../../../helpers";
import { NEXT_VALUE, PREVIOUS_VALUE } from "../../../../helpers/pivot/pivot_domain_helpers";
import { getFieldDisplayName } from "../../../../helpers/pivot/pivot_helpers";
import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores";
import { _t } from "../../../../translation";
import {
  PivotCoreDefinition,
  PivotCoreMeasure,
  PivotMeasureDisplay,
  PivotMeasureDisplayType,
  UID,
} from "../../../../types";

export class PivotMeasureDisplayPanelStore extends SpreadsheetStore {
  mutators = [
    "cancelMeasureDisplayEdition",
    "updateMeasureDisplayType",
    "updateMeasureDisplayField",
    "updateMeasureDisplayValue",
  ] as const;

  measureDisplay: PivotMeasureDisplay;

  constructor(get: Get, private pivotId: UID, private initialMeasure: PivotCoreMeasure) {
    super(get);
    this.measureDisplay = initialMeasure.display || { type: "no_calculations" };
  }

  updateMeasureDisplayType(measureDisplayType: PivotMeasureDisplayType) {
    this.updatePivotMeasureDisplay(
      this.getMeasureDisplay(
        measureDisplayType,
        this.measureDisplay.fieldNameWithGranularity,
        this.measureDisplay.value
      )
    );
  }

  updateMeasureDisplayField(fieldNameWithGranularity: string) {
    this.updatePivotMeasureDisplay(
      this.getMeasureDisplay(
        this.measureDisplay.type,
        fieldNameWithGranularity,
        this.measureDisplay.value
      )
    );
  }

  updateMeasureDisplayValue(value: string) {
    this.updatePivotMeasureDisplay(
      this.getMeasureDisplay(
        this.measureDisplay.type,
        this.measureDisplay.fieldNameWithGranularity,
        value
      )
    );
  }

  private updatePivotMeasureDisplay(newDisplay: PivotMeasureDisplay) {
    const pivotDefinition = deepCopy(this.model.getters.getPivotCoreDefinition(this.pivotId));
    const measureIndex = this.getMeasureIndex(this.initialMeasure.id, pivotDefinition);
    const newMeasure = { ...pivotDefinition.measures[measureIndex], display: newDisplay };
    pivotDefinition.measures[measureIndex] = newMeasure;
    const result = this.model.dispatch("UPDATE_PIVOT", {
      pivot: pivotDefinition,
      pivotId: this.pivotId,
    });
    if (result.isSuccessful) {
      this.measureDisplay = newDisplay;
    }
  }

  private getMeasureDisplay(
    measureDisplayType: PivotMeasureDisplayType,
    fieldNameWithGranularity: string | undefined,
    value: string | boolean | number | undefined
  ): PivotMeasureDisplay {
    switch (measureDisplayType) {
      case "no_calculations":
      case "%_of_grand_total":
      case "%_of_col_total":
      case "%_of_row_total":
      case "%_of_parent_row_total":
      case "%_of_parent_col_total":
      case "index":
        return { type: measureDisplayType };
      case "%_of_parent_total":
      case "running_total":
      case "%_running_total":
      case "rank_asc":
      case "rank_desc":
        if (!fieldNameWithGranularity) {
          fieldNameWithGranularity = this.fields[0]?.nameWithGranularity;
        }
        return { type: measureDisplayType, fieldNameWithGranularity };
      case "%_of":
      case "difference_from":
      case "%_difference_from":
        if (!fieldNameWithGranularity) {
          fieldNameWithGranularity = this.fields[0]?.nameWithGranularity;
        }
        const possibleValues = this.getPossibleValues(fieldNameWithGranularity);
        if (value === undefined || !possibleValues.find((v) => v.value === value)) {
          value = PREVIOUS_VALUE;
        }
        return {
          type: measureDisplayType,
          fieldNameWithGranularity,
          value: value ?? PREVIOUS_VALUE,
        };
    }
  }

  private getMeasureIndex(measureId: string, pivotDefinition: PivotCoreDefinition): number {
    const measureIndex = pivotDefinition.measures.findIndex((m) => m.id === measureId);
    if (measureIndex === -1) {
      throw new Error(`Measure with id ${measureId} not found in pivot.`);
    }
    return measureIndex;
  }

  get doesDisplayNeedsField(): boolean {
    return (
      ["%_of_parent_total", "running_total", "%_running_total", "rank_asc", "rank_desc"].includes(
        this.measureDisplay.type
      ) || this.doesDisplayNeedsValue
    );
  }

  get fields() {
    const definition = this.getters.getPivot(this.pivotId).definition;
    return [...definition.columns, ...definition.rows].map((f) => ({
      ...f,
      displayName: getFieldDisplayName(f),
    }));
  }

  get doesDisplayNeedsValue(): boolean {
    return this.isDisplayValueDependant(this.measureDisplay);
  }

  private isDisplayValueDependant(display: PivotMeasureDisplay): boolean {
    return ["%_of", "difference_from", "%_difference_from"].includes(display.type);
  }

  get values() {
    const display = this.measureDisplay;
    if (!this.isDisplayValueDependant(display)) {
      return [];
    }
    return this.getPossibleValues(display.fieldNameWithGranularity);
  }

  private getPossibleValues(fieldNameWithGranularity: string | undefined) {
    const baseValues = [
      { value: PREVIOUS_VALUE, label: _t("(previous)") },
      { value: NEXT_VALUE, label: _t("(next)") },
    ];
    const field = this.fields.find((f) => f.nameWithGranularity === fieldNameWithGranularity);
    if (!field) {
      return [];
    }
    const values = this.getters.getPivot(this.pivotId).getPossibleFieldValues(field);
    return [...baseValues, ...values];
  }

  cancelMeasureDisplayEdition() {
    const pivotDefinition = deepCopy(this.model.getters.getPivotCoreDefinition(this.pivotId));
    const measureIndex = this.getMeasureIndex(this.initialMeasure.id, pivotDefinition);
    pivotDefinition.measures[measureIndex] = {
      ...pivotDefinition.measures[measureIndex],
      display: this.initialMeasure.display,
    };
    this.model.dispatch("UPDATE_PIVOT", {
      pivot: pivotDefinition,
      pivotId: this.pivotId,
    });
  }
}
