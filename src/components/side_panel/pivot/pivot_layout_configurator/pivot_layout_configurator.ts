import { Component } from "@odoo/owl";
import { isDefined } from "../../../../helpers";
import {
  AGGREGATORS,
  getFieldDisplayName,
  isDateOrDatetimeField,
} from "../../../../helpers/pivot/pivot_helpers";
import { PivotRuntimeDefinition } from "../../../../helpers/pivot/pivot_runtime_definition";
import { Store, useStore } from "../../../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import {
  Aggregator,
  Granularity,
  PivotCoreDefinition,
  PivotCoreDimension,
  PivotCoreMeasure,
  PivotDimension as PivotDimensionType,
  PivotField,
  PivotMeasure,
} from "../../../../types/pivot";
import { ComposerFocusStore } from "../../../composer/composer_focus_store";
import { DragAndDropListItems } from "../../../drag_and_drop_list/drag_and_drop_list";
import { css } from "../../../helpers";
import { measureDisplayTerms } from "../../../translations_terms";
import { AddDimensionButton } from "./add_dimension_button/add_dimension_button";
import { PivotDimension } from "./pivot_dimension/pivot_dimension";
import { PivotDimensionGranularity } from "./pivot_dimension_granularity/pivot_dimension_granularity";
import { PivotDimensionOrder } from "./pivot_dimension_order/pivot_dimension_order";
import { PivotMeasureEditor } from "./pivot_measure/pivot_measure";

interface Props {
  definition: PivotRuntimeDefinition;
  onDimensionsUpdated: (definition: Partial<PivotCoreDefinition>) => void;
  unusedGroupableFields: PivotField[];
  measureFields: PivotField[];
  unusedGranularities: Record<string, Set<string>>;
  dateGranularities: string[];
  datetimeGranularities: string[];
  pivotId: UID;
}

css/* scss */ `
  .add-calculated-measure {
    cursor: pointer;
  }
`;

export class PivotLayoutConfigurator extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotLayoutConfigurator";
  static components = {
    AddDimensionButton,
    DragAndDropListItems,
    PivotDimension,
    PivotDimensionOrder,
    PivotDimensionGranularity,
    PivotMeasureEditor,
  };
  static props = {
    definition: Object,
    onDimensionsUpdated: Function,
    unusedGroupableFields: Array,
    measureFields: Array,
    unusedGranularities: Object,
    dateGranularities: Array,
    datetimeGranularities: Array,
    pivotId: String,
  };

  AGGREGATORS = AGGREGATORS;
  private composerFocus!: Store<ComposerFocusStore>;

  isDateOrDatetimeField = isDateOrDatetimeField;

  setup() {
    this.composerFocus = useStore(ComposerFocusStore);
  }

  get draggableItemIds() {
    const { columns, rows } = this.props.definition;
    return [
      ...columns.map((col) => col.nameWithGranularity),
      "__rows_title__",
      ...rows.map((row) => row.nameWithGranularity),
    ];
  }

  get draggableMeasureItemIds() {
    const { measures } = this.props.definition;
    return ["__measure_title__", ...measures.map((m) => m.id)];
  }

  canStartDimensionDrag(event: MouseEvent) {
    return (event.target as HTMLElement).tagName !== "SELECT";
  }

  getGranularitiesFor(field: PivotField) {
    if (!isDateOrDatetimeField(field)) {
      return [];
    }
    return field.type === "date" ? this.props.dateGranularities : this.props.datetimeGranularities;
  }

  canStartMeasureDrag(event: MouseEvent) {
    if (
      (event.target as HTMLElement).tagName === "SELECT" ||
      (event.target as HTMLElement).tagName === "INPUT" ||
      this.composerFocus.focusMode !== "inactive"
    ) {
      return false;
    }
    return true;
  }

  onDimensionDragEnd(dimensionName: string, originalIndex: number, finalIndex: number) {
    const draggedItems = [...this.draggableItemIds];
    draggedItems.splice(originalIndex, 1);
    draggedItems.splice(finalIndex, 0, dimensionName);
    const definition = this.props.definition;
    const { columns, rows } = definition;
    const allDimensions = columns.concat(rows);
    const columnIds = draggedItems.slice(0, draggedItems.indexOf("__rows_title__"));
    const rowIds = draggedItems.slice(draggedItems.indexOf("__rows_title__") + 1);
    this.props.onDimensionsUpdated({
      columns: columnIds
        .map((nameWithGranularity) =>
          allDimensions.find((dimension) => dimension.nameWithGranularity === nameWithGranularity)
        )
        .filter(isDefined),
      rows: rowIds
        .map((nameWithGranularity) =>
          allDimensions.find((dimension) => dimension.nameWithGranularity === nameWithGranularity)
        )
        .filter(isDefined),
    });
  }

  onMeasureDragEnd(measureId: string, originalIndex: number, finalIndex: number) {
    const { measures } = this.props.definition;
    const draggedItems = [...this.draggableMeasureItemIds];
    draggedItems.splice(originalIndex, 1);
    draggedItems.splice(finalIndex, 0, measureId);
    this.props.onDimensionsUpdated({
      measures: draggedItems
        .map((measureId) => measures.find((measure) => measure.id === measureId))
        .filter(isDefined),
    });
  }

  removeDimension(dimension: PivotDimensionType) {
    const { columns, rows } = this.props.definition;
    this.props.onDimensionsUpdated({
      columns: columns.filter((col) => col.nameWithGranularity !== dimension.nameWithGranularity),
      rows: rows.filter((row) => row.nameWithGranularity !== dimension.nameWithGranularity),
    });
  }

  removeMeasureDimension(measure: PivotMeasure) {
    const { measures } = this.props.definition;
    this.props.onDimensionsUpdated({
      measures: measures.filter((m) => m.id !== measure.id),
    });
  }

  addColumnDimension(fieldName: string) {
    const { columns }: { columns: PivotCoreDimension[] } = this.props.definition;
    this.props.onDimensionsUpdated({
      columns: columns.concat([{ fieldName: fieldName, order: "asc" }]),
    });
  }

  addRowDimension(fieldName: string) {
    const { rows }: { rows: PivotCoreDimension[] } = this.props.definition;
    this.props.onDimensionsUpdated({
      rows: rows.concat([{ fieldName: fieldName, order: "asc" }]),
    });
  }

  addMeasureDimension(fieldName: string) {
    const { measures }: { measures: PivotCoreMeasure[] } = this.props.definition;
    const aggregator = this.getDefaultMeasureAggregator(fieldName);
    this.props.onDimensionsUpdated({
      measures: measures.concat([
        { id: this.getMeasureId(fieldName, aggregator), fieldName, aggregator },
      ]),
    });
  }

  updateMeasure(measure: PivotMeasure, newMeasure: PivotMeasure) {
    const { measures }: { measures: PivotCoreMeasure[] } = this.props.definition;
    this.props.onDimensionsUpdated({
      measures: measures.map((m) => (m.id === measure.id ? newMeasure : m)),
    });
  }

  private getMeasureId(fieldName: string, aggregator?: string) {
    const baseId = fieldName + (aggregator ? `:${aggregator}` : "");
    let id = baseId;
    let i = 2;
    while (this.props.definition.measures.some((m) => m.id === id)) {
      id = `${baseId}:${i}`;
      i++;
    }
    return id;
  }

  private getDefaultMeasureAggregator(fieldName: string): Aggregator | string {
    const field = this.props.measureFields.find((f) => f.name === fieldName);
    return field?.aggregator ? field.aggregator : "count";
  }

  addCalculatedMeasure() {
    const { measures }: { measures: PivotCoreMeasure[] } = this.props.definition;
    const measureName = this.env.model.getters.generateNewCalculatedMeasureName(measures);
    this.props.onDimensionsUpdated({
      measures: measures.concat([
        {
          id: this.getMeasureId(measureName),
          fieldName: measureName,
          aggregator: "sum",
          computedBy: {
            sheetId: this.env.model.getters.getActiveSheetId(),
            formula: "=0",
          },
        },
      ]),
    });
  }

  updateOrder(updateDimension: PivotDimensionType, order?: "asc" | "desc") {
    const { rows, columns } = this.props.definition;
    this.props.onDimensionsUpdated({
      rows: rows.map((row) => {
        if (row.nameWithGranularity === updateDimension.nameWithGranularity) {
          return { ...row, order: order || undefined };
        }
        return row;
      }),
      columns: columns.map((col) => {
        if (col.nameWithGranularity === updateDimension.nameWithGranularity) {
          return { ...col, order: order || undefined };
        }
        return col;
      }),
    });
  }

  updateGranularity(dimension: PivotDimensionType, granularity: Granularity) {
    const { rows, columns } = this.props.definition;
    this.props.onDimensionsUpdated({
      rows: rows.map((row) => {
        if (row.nameWithGranularity === dimension.nameWithGranularity) {
          return { ...row, granularity };
        }
        return row;
      }),
      columns: columns.map((col) => {
        if (col.nameWithGranularity === dimension.nameWithGranularity) {
          return { ...col, granularity };
        }
        return col;
      }),
    });
  }

  getMeasureDescription(measure: PivotMeasure) {
    const measureDisplay = measure.display;
    if (!measureDisplay || measureDisplay.type === "no_calculations") {
      return "";
    }
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    const field = [...pivot.definition.columns, ...pivot.definition.rows].find(
      (f) => f.nameWithGranularity === measureDisplay.fieldNameWithGranularity
    );
    const fieldName = field ? getFieldDisplayName(field) : "";

    return measureDisplayTerms.descriptions[measureDisplay.type](fieldName);
  }
}
