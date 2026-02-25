import { GridRenderingContext, isDefined } from "@odoo/o-spreadsheet-engine";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { PivotDimension, PivotField, PivotMeasure } from "@odoo/o-spreadsheet-engine/types/pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Store } from "@odoo/o-spreadsheet-engine/types/store_engine";
import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { positionToZone } from "../../../helpers";
import { useLocalStore } from "../../../store_engine";
import { useDragAndDropListItems } from "../../helpers/drag_and_drop_dom_items_hook";
import { AddDimensionButton } from "../../side_panel/pivot/pivot_layout_configurator/add_dimension_button/add_dimension_button";
import { PivotSidePanelStore } from "../../side_panel/pivot/pivot_side_panel/pivot_side_panel_store";
import { StandaloneGridCanvas } from "../../standalone_grid_canvas/standalone_grid_canvas";
import { PivotFacet } from "../pivot_facet/pivot_facet";

interface Props {}

type DimensionType = "rows" | "columns" | "measures";

interface DragAndDropState {
  dimension: PivotDimension | PivotMeasure;
  dimensionType: DimensionType;
  index: number;
}

interface State {
  externalDragState?: DragAndDropState;
}

export class PivotOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotOverlay";
  static props = { "*": Object }; // ADRM TODO
  static components = { PivotFacet, StandaloneGridCanvas, AddDimensionButton };

  state = useState<State>({});
  private dragAndDrop = useDragAndDropListItems();

  pivotStore!: Store<PivotSidePanelStore>;

  setup() {
    this.pivotStore = useLocalStore(PivotSidePanelStore, this.pivotId, "neverDefer");
    const overlayRef = useRef("pivotOverlay");
    useEffect(() => {
      if (!overlayRef.el) {
        return;
      }
      const position = this.pivotFormulaPosition!; // ADRM TODO
      // const rect = this.env.model.getters.getRect(positionToZone(position));
      const rect = this.env.model.getters.getRect(positionToZone(position));

      const heightOffset = 0;
      // const horizontalOverlays = overlayRef.el.querySelectorAll(
      //   ".o-pivot-measures, .o-pivot-columns"
      // );
      // for (const horizontalOverlay of horizontalOverlays) {
      //   heightOffset = Math.max(heightOffset, horizontalOverlay.getBoundingClientRect().height);
      // }

      const widthOffset = 0;
      // const verticalOverlays = overlayRef.el.querySelectorAll(".o-pivot-rows");
      // for (const verticalOverlay of verticalOverlays) {
      //   widthOffset = Math.max(widthOffset, verticalOverlay.getBoundingClientRect().width);
      // }

      const y = Math.max(rect.y - heightOffset);
      const x = Math.max(rect.x - widthOffset);

      overlayRef.el.style.left = x + "px";
      overlayRef.el.style.top = y - 1 + "px"; // -1 for cell border
      const sheetViewDims = this.env.model.getters.getSheetViewDimension();
      overlayRef.el.style.maxWidth = sheetViewDims.width + "px"; // ADRM TODO
      overlayRef.el.style.maxHeight = sheetViewDims.height + "px"; // ADRM TODO
    });
  }

  get overlayStyle() {
    return "";
  }

  get _pivotFormulaPosition() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    for (const { position, pivotId } of this.env.model.getters.getAllPivotArrayFormulas()) {
      if (position.sheetId === sheetId && pivotId === this.pivotId) {
        return position;
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
    return "1"; // ADRM TODO props
  }

  get definition() {
    return this.env.model.getters.getPivot(this.pivotId).definition;
  }

  get pivotGridProps(): StandaloneGridCanvas["props"] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = this.pivotFormulaPosition;
    const zone = this.env.model.getters.getSpreadZone(position) || positionToZone(position);
    const firstRowStart = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.env.model.getters.getColDimensions(sheetId, zone.right).end;

    const viewports = new ViewportCollection(this.env.model.getters);
    viewports.sheetViewWidth = lastColEnd - firstColStart;
    viewports.sheetViewHeight = lastRowEnd - firstRowStart;
    viewports.setSheetViewOffset(sheetId, firstColStart, firstRowStart);

    const renderingCtx: Partial<GridRenderingContext> = { selectedZones: [], sheetId, viewports };

    return { sheetId, zone, renderingCtx };
  }

  getDisplayedColumnsGroups() {
    const columns = this.definition.columns;
    // insert d&d placeholder
    if (this.state.externalDragState && this.state.externalDragState.dimensionType === "columns") {
      const newColumns = [...columns];
      const draggedDimension = this.state.externalDragState.dimension;
      newColumns.splice(this.state.externalDragState.index, 0, draggedDimension as PivotDimension);
      return newColumns;
    }

    return columns;
  }

  onDragOverColumn(ev: DragEvent) {
    // const target = ev.currentTarget as HTMLElement;
    // const dndState = this.state.externalDragState;
    // if (ev.dataTransfer?.types.includes(PIVOT_DRAG_AND_DROP_MIMETYPE)) {
    //   console.log("invludes");
    // }
    // ev.preventDefault();
    // const facetsRects = [...target.querySelectorAll(".o-pivot-facet")]
    //   .map((facet) => facet.getBoundingClientRect())
    //   .slice(0, -1) // exclude the "add" facet
    //   .filter((x, i) => !dndState || i !== dndState.index); // exclude dragged facet
    // const dragX = ev.clientX;
    // let insertIndex = facetsRects.findIndex((rect) => dragX < rect.x + rect.width / 2);
    // if (insertIndex === -1) {
    //   insertIndex = facetsRects.length;
    // }
    // const fields = this.env.model.getters.getPivot(this.pivotId).getFields();
    // const field = Object.values(fields)[0]!;
    // const mockDimension = this.fieldToDimension(field);
    // const newState: DragAndDropState = {
    //   dimensionType: "columns",
    //   index: insertIndex,
    //   dimension: mockDimension,
    // };
    // if (!deepEquals(this.state.externalDragState, newState)) {
    //   this.state.externalDragState = newState;
    //   console.log(newState);
    // }
  }

  onDropColumn(ev: DragEvent) {
    // if (!ev.dataTransfer) {
    //   return;
    // }
    // ev.preventDefault();
    // console.log("onDrop");
    // const data = ev.dataTransfer.getData(PIVOT_DRAG_AND_DROP_MIMETYPE);
    // const droppedField: PivotField = JSON.parse(data);
    // console.log(droppedField);
  }

  onRemoveColumn(column: PivotDimension) {
    const newColumns = this.definition.columns.filter(
      (col) => col.nameWithGranularity !== column.nameWithGranularity
    );
    this.pivotStore.update({ columns: newColumns });
  }

  onAddColumn(fieldName: string) {
    const field = this.env.model.getters.getPivot(this.pivotId).getFields()[fieldName];
    if (!field) {
      return;
    }
    this.pivotStore.update({
      columns: this.definition.columns.concat(this.fieldToDimension(field)),
    });
  }

  startDragAndDrop(column: PivotDimension, event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }

    const target = (event.target as HTMLElement).closest<HTMLElement>(".o-pivot-overlay-section");
    if (!target) {
      return;
    }
    const draggableItems = [...target.children]
      .map((child) => {
        const id = child.querySelector(".o-pivot-facet")?.getAttribute("data-id");
        if (!id) {
          return undefined;
        }
        const rect = child.getBoundingClientRect();
        return { id, size: rect.width, position: rect.x };
      })
      .filter(isDefined);
    console.log(draggableItems);

    this.dragAndDrop.start("horizontal", {
      draggedItemId: column.nameWithGranularity,
      initialMousePosition: event.clientX,
      items: draggableItems,
      scrollableContainerEl: target,
      onDragEnd: (draggedItemId, finalIndex) => {
        console.log("onDragEnd", draggedItemId, finalIndex);
        const draggedIds = draggableItems.map((item) => item.id);
        const originalIndex = draggedIds.findIndex((id) => id === draggedItemId);
        if (originalIndex === finalIndex) {
          return;
        }
        const newIds = [...draggedIds];
        newIds.splice(originalIndex, 1);
        newIds.splice(finalIndex, 0, draggedItemId);
        const definition = this.env.model.getters.getPivot(this.pivotId).definition;
        const newColumns = newIds.map(
          (id) => definition.columns.find((col) => col.nameWithGranularity === id)!
        );
        console.log(newColumns);
        this.pivotStore.update({ columns: newColumns });
      },
    });
  }

  private fieldToDimension(field: PivotField): PivotDimension {
    return {
      type: field.type,
      displayName: field.string,
      fieldName: field.name,
      isValid: true,
      nameWithGranularity: field.name,
      order: "asc",
    };
  }
}
