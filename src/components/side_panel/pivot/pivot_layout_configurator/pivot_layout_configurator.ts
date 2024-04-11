import { Component, useRef } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../..";
import { isDefined } from "../../../../helpers";
import { AGGREGATORS, isDateField, parseDimension } from "../../../../helpers/pivot/pivot_helpers";
import { PivotRuntimeDefinition } from "../../../../helpers/pivot/pivot_runtime_definition";
import {
  Granularity,
  PivotCoreDefinition,
  PivotCoreDimension,
  PivotCoreMeasure,
  PivotDimension as PivotDimensionType,
  PivotField,
  PivotMeasure,
} from "../../../../types/pivot";
import { useDragAndDropListItems } from "../../../helpers/drag_and_drop_hook";
import { AddDimensionButton } from "./add_dimension_button/add_dimension_button";
import { PivotDimension } from "./pivot_dimension/pivot_dimension";
import { PivotDimensionGranularity } from "./pivot_dimension_granularity/pivot_dimension_granularity";
import { PivotDimensionOrder } from "./pivot_dimension_order/pivot_dimension_order";

interface Props {
  definition: PivotRuntimeDefinition;
  onDimensionsUpdated: (definition: Partial<PivotCoreDefinition>) => void;
  unusedGroupableFields: PivotField[];
  unusedMeasureFields: PivotField[];
  unusedDateTimeGranularities: Record<string, Set<string>>;
  allGranularities: string[];
}

export class PivotLayoutConfigurator extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotLayoutConfigurator";
  static components = {
    AddDimensionButton,
    PivotDimension,
    PivotDimensionOrder,
    PivotDimensionGranularity,
  };
  static props = {
    definition: Object,
    onDimensionsUpdated: Function,
    unusedGroupableFields: Array,
    unusedMeasureFields: Array,
    unusedDateTimeGranularities: Object,
    allGranularities: Array,
  };

  private dimensionsRef = useRef("pivot-dimensions");
  private dragAndDrop = useDragAndDropListItems();
  AGGREGATORS = AGGREGATORS;
  isDateField = isDateField;

  startDragAndDrop(dimension: PivotDimensionType, event: MouseEvent) {
    if (event.button !== 0 || (event.target as HTMLElement).tagName === "SELECT") {
      return;
    }

    const rects = this.getDimensionElementsRects();
    const definition = this.props.definition;
    const { columns, rows } = definition;
    const draggableIds = [
      ...columns.map((col) => col.nameWithGranularity),
      "__rows_title__",
      ...rows.map((row) => row.nameWithGranularity),
    ];
    const offset = 1; // column title
    const draggableItems = draggableIds.map((id, index) => ({
      id,
      size: rects[index + offset].height,
      position: rects[index + offset].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: dimension.nameWithGranularity,
      initialMousePosition: event.clientY,
      items: draggableItems,
      containerEl: this.dimensionsRef.el!,
      onDragEnd: (dimensionName, finalIndex) => {
        const originalIndex = draggableIds.findIndex((id) => id === dimensionName);
        if (originalIndex === finalIndex) {
          return;
        }
        const draggedItems = [...draggableIds];
        draggedItems.splice(originalIndex, 1);
        draggedItems.splice(finalIndex, 0, dimensionName);
        const columns = draggedItems.slice(0, draggedItems.indexOf("__rows_title__"));
        const rows = draggedItems.slice(draggedItems.indexOf("__rows_title__") + 1);
        this.props.onDimensionsUpdated({
          columns: columns.map(parseDimension),
          rows: rows.map(parseDimension),
        });
      },
    });
  }

  startDragAndDropMeasures(measure: PivotMeasure, event: MouseEvent) {
    if (event.button !== 0 || (event.target as HTMLElement).tagName === "SELECT") {
      return;
    }

    const rects = this.getDimensionElementsRects();
    const definition = this.props.definition;
    const { measures, columns, rows } = definition;
    const draggableIds = measures.map((m) => m.name);
    const offset = 3 + columns.length + rows.length; // column title, row title, measure title
    const draggableItems = draggableIds.map((id, index) => ({
      id,
      size: rects[index + offset].height,
      position: rects[index + offset].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: measure.name,
      initialMousePosition: event.clientY,
      items: draggableItems,
      containerEl: this.dimensionsRef.el!,
      onDragEnd: (measureName, finalIndex) => {
        const originalIndex = draggableIds.findIndex((id) => id === measureName);
        if (originalIndex === finalIndex) {
          return;
        }
        const draggedItems = [...draggableIds];
        draggedItems.splice(originalIndex, 1);
        draggedItems.splice(finalIndex, 0, measureName);
        this.props.onDimensionsUpdated({
          measures: draggedItems
            .map((m) => measures.find((measure) => measure.name === m))
            .filter(isDefined),
        });
      },
    });
  }

  getDimensionElementsRects() {
    return Array.from(this.dimensionsRef.el!.children).map((el) => {
      const style = getComputedStyle(el)!;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width + parseInt(style.marginLeft || "0") + parseInt(style.marginRight || "0"),
        height:
          rect.height + parseInt(style.marginTop || "0") + parseInt(style.marginBottom || "0"),
      };
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
      measures: measures.filter((m) => m.name !== measure.name),
    });
  }

  addColumnDimension(fieldName: string) {
    const { columns }: { columns: PivotCoreDimension[] } = this.props.definition;
    this.props.onDimensionsUpdated({
      columns: columns.concat([{ name: fieldName, order: "asc" }]),
    });
  }

  addRowDimension(fieldName: string) {
    const { rows }: { rows: PivotCoreDimension[] } = this.props.definition;
    this.props.onDimensionsUpdated({
      rows: rows.concat([{ name: fieldName, order: "asc" }]),
    });
  }

  addMeasureDimension(fieldName: string) {
    const { measures }: { measures: PivotCoreMeasure[] } = this.props.definition;
    this.props.onDimensionsUpdated({
      measures: measures.concat([{ name: fieldName }]),
    });
  }

  updateAggregator(updatedMeasure: PivotMeasure, aggregator: string) {
    const { measures } = this.props.definition;
    this.props.onDimensionsUpdated({
      measures: measures.map((measure) => {
        if (measure === updatedMeasure) {
          return { ...measure, aggregator };
        }
        return measure;
      }),
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
}
