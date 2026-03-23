import {
  _t,
  debounce,
  deepCopy,
  Highlight,
  isDefined,
  Rect,
  Zone,
} from "@odoo/o-spreadsheet-engine";
import { getNewMeasureId } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import {
  Aggregator,
  PivotCoreDefinition,
  PivotDimension,
  PivotMeasure,
} from "@odoo/o-spreadsheet-engine/types/pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import {
  cellPositions,
  positionToZone,
  recomputeZones,
  setColorAlpha,
  union,
} from "../../../helpers";
import { useLocalStore, useStore } from "../../../store_engine";
import {
  PivotDragAndDropState,
  PivotDragEndEvent,
  useDragAndDropPivotItems,
} from "../../helpers/drag_and_drop_dom_pivot_items";

import { HIGHLIGHT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import {
  PivotDragAndDropItem,
  PivotDragAndDropStore,
} from "../../../stores/pivot_drag_and_drop_store";
import { cssPropertiesToCss } from "../../helpers";
import { getBoundingRectAsPOJO } from "../../helpers/dom_helpers";
import { AddDimensionButton } from "../../side_panel/pivot/pivot_layout_configurator/add_dimension_button/add_dimension_button";
import { PivotSidePanelStore } from "../../side_panel/pivot/pivot_side_panel/pivot_side_panel_store";
import { PivotFacet } from "../pivot_facet/pivot_facet";

interface Props {
  pivotId: string;
  onOverlayResized: (width: number, height: number) => void;
}

type DimensionType = "rows" | "columns" | "measures";

type PivotArea = {
  type: DimensionType;
  zone: Zone;
  rect: Rect;
};

interface State {
  hoveredPivotArea: DimensionType | undefined;
}

type PivotUpdateError = { updateType: "error"; message: string };

type PivotUpdate =
  | { updateType: "change"; definition: Partial<PivotCoreDefinition> }
  | PivotUpdateError;

// ADRM TODO: do something about zoom
// ADRM TODO: do something about duplicated dragged item before mousemove
// ADRM TODO: display placeholder on starting drag container
// ADRM TODO: #SPILL
// ADRM TODO: drag & drop on rows when there are no rows looks strange
// ADRM TODO: traceback on add count measure
// ADRM TODO: something better than itemsStyle['placeholder-item']
// ADRM TODO: go though drag_and_drop_dom_pivot_items and clean the code
export class PivotOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotOverlay";
  static props = { "*": Object }; // ADRM TODO
  static components = { PivotFacet, AddDimensionButton };

  state = useState<State>({ hoveredPivotArea: undefined });

  private columnsSectionRef = useRef("columnsContainer");
  private rowsSectionRef = useRef("rowsContainer");
  private measuresSectionRef = useRef("measuresContainer");

  dragAndDropCols!: PivotDragAndDropState;
  dragAndDropRows!: PivotDragAndDropState;
  dragAndDropMeasures!: PivotDragAndDropState;

  pivotStore!: Store<PivotSidePanelStore>;
  pivotDragAndDropStore!: Store<PivotDragAndDropStore>;

  draggedItemOverPivotArea: PivotDragAndDropItem | undefined = undefined;

  private pendingPivotUpdate: PivotUpdate[] = [];

  setup() {
    this.pivotDragAndDropStore = useStore(PivotDragAndDropStore);
    this.pivotStore = useLocalStore(PivotSidePanelStore, this.pivotId, "neverDefer");
    const overlayRef = useRef("pivotOverlay");
    this.dragAndDropCols = useDragAndDropPivotItems({
      containerRef: this.columnsSectionRef,
      direction: "horizontal",
      getDraggedItemAtCursor: (ev) => this.getDragAndDropItemAtEvent(ev, "columns"),
      getDraggedItems: (ev) => this.getDragAndDropItems(ev),
      onDragEnd: (dragEndEvent) => this.onDragEnd("columns", dragEndEvent),
    });
    this.dragAndDropRows = useDragAndDropPivotItems({
      containerRef: this.rowsSectionRef,
      direction: "vertical",
      getDraggedItemAtCursor: (ev) => this.getDragAndDropItemAtEvent(ev, "rows"),
      getDraggedItems: (ev) => this.getDragAndDropItems(ev),
      onDragEnd: (dragEndEvent) => this.onDragEnd("rows", dragEndEvent),
    });
    this.dragAndDropMeasures = useDragAndDropPivotItems({
      containerRef: this.measuresSectionRef,
      direction: "vertical",
      getDraggedItemAtCursor: (ev) => this.getDragAndDropItemAtEvent(ev, "measures"),
      getDraggedItems: (ev) => this.getDragAndDropItems(ev),
      onDragEnd: (dragEndEvent) => this.onDragEnd("measures", dragEndEvent),
    });
    useEffect(() => {
      if (!overlayRef.el) {
        return;
      }

      // ADRM TODO: use ref or resize observer ?
      const measuresContainerRect = this.measuresSectionRef.el?.getBoundingClientRect();
      if (!measuresContainerRect) {
        return;
      }
      const { width, height } = measuresContainerRect;
      this.props.onOverlayResized(width + 1, height + 1);

      // const position = this.pivotFormulaPosition!; // ADRM TODO
      // const rect = this.env.model.getters.getRect(positionToZone(position));
      // const rect = this.env.model.getters.getRect(positionToZone(position));
      // let heightOffset = 0;
      // const horizontalOverlays = overlayRef.el.querySelectorAll(
      //   ".o-pivot-measures, .o-pivot-columns"
      // );
      // for (const horizontalOverlay of horizontalOverlays) {
      //   heightOffset = Math.max(heightOffset, horizontalOverlay.getBoundingClientRect().height);
      // }
      // heightOffset = Math.ceil(heightOffset);

      // const verticalOverlays = overlayRef.el.querySelectorAll<HTMLElement>(
      //   ".o-pivot-measures, .o-pivot-rows"
      // );
      // const width = 250;
      // for (const verticalOverlay of verticalOverlays) {
      //   // verticalOverlay.style.width = width + "px"; // ADRM TODO: use real grid & stop being stupid
      // }

      // this.props.onOverlayResized(width, heightOffset);

      // // const y = Math.max(rect.y - heightOffset);
      // // const x = Math.max(rect.x - widthOffset);

      // overlayRef.el.style.left = 0 + "px";
      // overlayRef.el.style.top = 0 + "px";
      // const sheetViewDims = this.env.model.getters.getSheetViewDimension();
      // overlayRef.el.style.maxWidth = sheetViewDims.width + "px"; // ADRM TODO
      // overlayRef.el.style.maxHeight = sheetViewDims.height + "px"; // ADRM TODO
    });
  }

  get overlayStyle() {
    return "";
  }

  get _pivotFormulaPosition() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    for (const { position, pivotId } of this.env.model.getters.getAllPivotArrayFormulas()) {
      if (position.sheetId === sheetId && pivotId === this.pivotId) {
        const pivot = this.env.model.getters.getPivot(pivotId);
        return pivot.isValid() ? position : undefined;
      }
    }
    return undefined;
  }

  get hasPivotFormula() {
    return !!this._pivotFormulaPosition;
  }

  get pivotFormulaPosition() {
    if (!this._pivotFormulaPosition) {
      throw new Error("Pivot formula position not found");
    }
    return this._pivotFormulaPosition;
  }

  get pivotId() {
    return this.props.pivotId;
  }

  get definition() {
    return this.env.model.getters.getPivot(this.pivotId).definition;
  }

  onRemoveColumn(column: PivotDimension) {
    const newColumns = this.definition.columns.filter(
      (col) => col.nameWithGranularity !== column.nameWithGranularity
    );
    this.pivotStore.update({ columns: newColumns });
  }

  onAddColumn(fieldName: string) {
    this.pivotStore.update({
      columns: this.definition.columns.concat(this.fieldToDimension(fieldName)),
    });
  }

  onRemoveRow(row: PivotDimension) {
    const newRows = this.definition.rows.filter(
      (r) => r.nameWithGranularity !== row.nameWithGranularity
    );
    this.pivotStore.update({ rows: newRows });
  }

  onAddRow(fieldName: string) {
    const newRow = this.fieldToDimension(fieldName);
    this.pivotStore.update({ rows: this.definition.rows.concat(newRow) });
  }

  onRemoveMeasure(measure: PivotMeasure) {
    const newMeasures = this.definition.measures.filter((m) => m.id !== measure.id);
    this.pivotStore.update({ measures: newMeasures });
  }

  onAddMeasure(fieldName: string) {
    this.pivotStore.update({
      measures: this.definition.measures.concat(this.fieldToMeasure(fieldName)),
    });
  }

  private getDefaultMeasureAggregator(fieldName: string): Aggregator | string {
    // // ADRM TODO unduplicate from layout configurator ?
    const field = this.pivotStore.measureFields.find((f) => f.name === fieldName);
    return field?.aggregator ? field.aggregator : "count";
  }

  private getDragAndDropItems(event: MouseEvent) {
    const container = (event.target as HTMLElement).closest<HTMLElement>(
      ".o-pivot-overlay-section"
    );
    if (!container) {
      console.log("container not found");
      return [];
    }
    const draggableItems = [...container.children]
      .map((child) => {
        const id = child.querySelector(".o-pivot-facet")?.getAttribute("data-id");
        if (!id) {
          return undefined;
        }
        return { id, rect: getBoundingRectAsPOJO(child) };
      })
      .filter(isDefined);
    return draggableItems;
  }

  private getDragAndDropItemAtEvent(
    event: MouseEvent,
    dimensionType: DimensionType
  ): PivotDragAndDropItem | undefined {
    const draggedItem = (event.target as HTMLElement).closest(".o-pivot-facet");
    const itemId = draggedItem?.getAttribute("data-id");
    if (!itemId) {
      return undefined;
    }

    if (dimensionType === "columns") {
      const column = this.definition.columns.find((col) => col.nameWithGranularity === itemId);
      return column
        ? {
            id: column.nameWithGranularity,
            label: column.displayName,
            type: "column",
            dimension: column,
          }
        : undefined;
    }
    if (dimensionType === "rows") {
      const row = this.definition.rows.find((row) => row.nameWithGranularity === itemId);
      return row
        ? { id: row.nameWithGranularity, label: row.displayName, type: "row", dimension: row }
        : undefined;
    }
    if (dimensionType === "measures") {
      const measure = this.definition.measures.find((measure) => measure.id === itemId);
      return measure
        ? { id: measure.id, label: measure.fieldName, type: "measure", measure }
        : undefined;
    }
    return undefined;
  }

  private onDragEnd(type: DimensionType, dragEndEvent: PivotDragEndEvent) {
    const pivotUpdate = this.getPivotUpdateOnDragEnd(type, dragEndEvent);
    if (pivotUpdate) {
      this.pendingPivotUpdate.push(pivotUpdate);
      this.debouncedApplyPendingPivotUpdates();
    }
  }

  private getPivotUpdateOnDragEnd(
    type: DimensionType,
    dragEndEvent: PivotDragEndEvent
  ): PivotUpdate | undefined {
    console.log("onDragEnd", type, dragEndEvent.type);
    const items = deepCopy(this.definition[type]);
    const getItemId = (item: PivotDimension | PivotMeasure) =>
      "nameWithGranularity" in item ? item.nameWithGranularity : item.id;
    if (dragEndEvent.type === "MOVE") {
      const originalIndex = items.findIndex((item) => dragEndEvent.item.id === getItemId(item));
      if (originalIndex === dragEndEvent.moveToIndex || originalIndex === -1) {
        return;
      }
      const newItems = [...items];
      const tmp = newItems[dragEndEvent.moveToIndex];
      newItems[dragEndEvent.moveToIndex] = newItems[originalIndex];
      newItems[originalIndex] = tmp;
      return { updateType: "change", definition: { [type]: newItems } };
    } else if (dragEndEvent.type === "REMOVE") {
      const newItems = items.filter((item) => dragEndEvent.item.id !== getItemId(item));
      return { updateType: "change", definition: { [type]: newItems } };
    } else if (dragEndEvent.type === "ADD") {
      return this.insertNewItemInPivot(type, dragEndEvent.item, dragEndEvent.index);
    }
    return undefined;
  }

  private insertNewItemInPivot(
    type: DimensionType,
    item: PivotDragAndDropItem,
    index?: number
  ): PivotUpdate | undefined {
    const items = deepCopy(this.definition[type]);
    const newItem =
      type === "measures"
        ? this.createMeasureFromPivotDragItem(item)
        : this.createDimensionFromPivotDragItem(item);
    if ("updateType" in newItem && newItem.updateType === "error") {
      return newItem;
    }
    const newItems = [...items];
    newItems.splice(index ?? newItems.length, 0, newItem as PivotDimension | PivotMeasure);
    return { updateType: "change", definition: { [type]: newItems } };
  }

  private createMeasureFromPivotDragItem(
    item: PivotDragAndDropItem
  ): PivotMeasure | PivotUpdateError {
    switch (item.type) {
      case "measure":
        return item.measure;
      case "column":
      case "row":
        return this.fieldToMeasure(item.dimension.fieldName);
      case "field":
        return this.fieldToMeasure(item.field.name);
    }
  }

  private createDimensionFromPivotDragItem(
    item: PivotDragAndDropItem
  ): PivotDimension | PivotUpdateError {
    switch (item.type) {
      case "measure":
        if (item.measure.computedBy) {
          return {
            updateType: "error",
            message: _t("Cannot use a calculated measure as a pivot dimension."),
          };
        }
        return this.fieldToDimension(item.measure.fieldName);
      case "column":
      case "row":
        return item.dimension;
      case "field":
        return this.fieldToDimension(item.field.name);
    }
  }

  private fieldToDimension(fieldName: string): PivotDimension {
    const field = this.env.model.getters.getPivot(this.pivotId).getFields()[fieldName];
    if (!field) {
      throw new Error("Field with name " + fieldName + " not found");
    }
    return {
      type: field.type,
      displayName: field.string,
      fieldName: field.name,
      isValid: true,
      nameWithGranularity: field.name,
      order: "asc",
    };
  }

  private fieldToMeasure(fieldName: string): PivotMeasure {
    const field = this.env.model.getters.getPivot(this.pivotId).getFields()[fieldName];
    if (!field) {
      throw new Error("Field with name " + fieldName + " not found");
    }
    const aggregator = this.getDefaultMeasureAggregator(field.name);
    return {
      id: getNewMeasureId(this.definition, field.name, aggregator),
      fieldName: field.name,
      aggregator,
    } as PivotMeasure;
  }

  getPivotsAreasInGrid(): PivotArea[] {
    // ADRM TODO: cache this, or cache getPivotCellFromPosition
    if (!this.pivotDragAndDropStore.draggedItem) {
      return [];
    }

    const sheetId = this.env.model.getters.getActiveSheetId();
    const spread = this.env.model.getters.getSpreadZone(this.pivotFormulaPosition);
    if (!spread) {
      return [];
    }
    let rowsZone: Zone | undefined = undefined;
    let columnsZone: Zone | undefined = undefined;
    let measuresZone: Zone | undefined = undefined;

    for (const position of cellPositions(sheetId, spread)) {
      const zone = positionToZone(position);
      const pivotCell = this.env.model.getters.getPivotCellFromPosition(position);
      if (pivotCell.type === "VALUE" || pivotCell.type === "MEASURE_HEADER") {
        measuresZone = measuresZone ? union(measuresZone, zone) : zone;
      } else if (pivotCell.type === "HEADER" && pivotCell.dimension === "COL") {
        columnsZone = columnsZone ? union(columnsZone, zone) : zone;
      } else if (pivotCell.type === "HEADER" && pivotCell.dimension === "ROW") {
        rowsZone = rowsZone ? union(rowsZone, zone) : zone;
      }
    }

    const areas: PivotArea[] = [];
    if (rowsZone) {
      const rect = this.env.model.getters.getVisibleRect(rowsZone);
      areas.push({ type: "rows", zone: rowsZone, rect });
    }
    if (columnsZone) {
      const rect = this.env.model.getters.getVisibleRect(columnsZone);
      areas.push({ type: "columns", zone: columnsZone, rect });
    }
    if (measuresZone) {
      const rect = this.env.model.getters.getVisibleRect(measuresZone);
      areas.push({ type: "measures", zone: measuresZone, rect });
    }

    return areas;
  }

  getPivotAreaStyle(area: PivotArea) {
    return cssPropertiesToCss({
      left: area.rect.x + "px",
      top: area.rect.y + "px",
      width: area.rect.width + "px",
      height: area.rect.height + "px",
      background:
        this.state.hoveredPivotArea === area.type ? setColorAlpha(HIGHLIGHT_COLOR, 0.3) : "",
      "border-color": HIGHLIGHT_COLOR,
    });
  }

  onPivotAreaMouseEnter(area: PivotArea) {
    this.state.hoveredPivotArea = area.type;
    this.draggedItemOverPivotArea = this.pivotDragAndDropStore.draggedItem;
  }

  onPivotAreaMouseLeave() {
    this.state.hoveredPivotArea = undefined;
    this.draggedItemOverPivotArea = undefined;
  }

  onPivotAreaPointerUp(area: PivotArea) {
    if (!this.draggedItemOverPivotArea) {
      return;
    }
    this.insertNewItemInPivot(area.type, this.draggedItemOverPivotArea);
  }

  getHighlightsForMeasure(measure: PivotMeasure): Highlight[] {
    if (this.pivotDragAndDropStore.draggedItem) {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const spread = this.env.model.getters.getSpreadZone(this.pivotFormulaPosition);
    if (!spread) {
      return [];
    }
    const zones: Zone[] = [];
    for (const position of cellPositions(sheetId, spread)) {
      const pivotCell = this.env.model.getters.getPivotCellFromPosition(position);
      if (pivotCell.type === "MEASURE_HEADER" && pivotCell.measure === measure.id) {
        zones.push(positionToZone(position));
      } else if (pivotCell.type === "VALUE" && pivotCell.measure === measure.id) {
        zones.push(positionToZone(position));
      }
    }
    return recomputeZones(zones).map((zone) => ({
      color: HIGHLIGHT_COLOR,
      fillAlpha: 0.12,
      range: this.env.model.getters.getRangeFromZone(sheetId, zone),
    }));
  }

  // ADRM TODO: the code to loop on all pivot cells is repeated thrice. Create mapOnPivotCells ?
  getHighlightsForDimension(dimensionType: DimensionType, dimension: PivotDimension): Highlight[] {
    if (this.pivotDragAndDropStore.draggedItem) {
      return [];
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const spread = this.env.model.getters.getSpreadZone(this.pivotFormulaPosition);
    if (!spread) {
      return [];
    }
    const zones: Zone[] = [];
    for (const position of cellPositions(sheetId, spread)) {
      const pivotCell = this.env.model.getters.getPivotCellFromPosition(position);
      if (
        pivotCell.type === "HEADER" &&
        pivotCell.domain.at(-1)?.field === dimension.nameWithGranularity
      ) {
        zones.push(positionToZone(position));
      } else if (
        pivotCell.type === "ROW_GROUP_NAME" &&
        dimensionType === "rows" &&
        pivotCell.rowField === dimension.nameWithGranularity
      ) {
        zones.push(positionToZone(position));
      }
    }
    return recomputeZones(zones).map((zone) => ({
      color: HIGHLIGHT_COLOR,
      fillAlpha: 0.12,
      range: this.env.model.getters.getRangeFromZone(sheetId, zone),
    }));
  }

  exitPivotEdition() {
    // ADRM TODO
  }

  private debouncedApplyPendingPivotUpdates = debounce(() => {
    if (this.pendingPivotUpdate.some((update) => update.updateType === "error")) {
      const errorUpdate = this.pendingPivotUpdate.find((update) => update.updateType === "error")!;
      this.env.notifyUser({ sticky: false, type: "warning", text: errorUpdate.message });
    } else {
      const newPivotDefinition: Partial<PivotCoreDefinition> = {};
      for (const update of this.pendingPivotUpdate) {
        if (update.updateType === "change") {
          Object.assign(newPivotDefinition, update.definition);
        }
      }
      this.pivotStore.update(newPivotDefinition);
    }

    this.pendingPivotUpdate = [];
  }, 0);
}
