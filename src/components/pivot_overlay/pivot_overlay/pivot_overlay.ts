import { GridRenderingContext } from "@odoo/o-spreadsheet-engine";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useEffect, useRef } from "@odoo/owl";
import { positionToZone } from "../../../helpers";
import { StandaloneGridCanvas } from "../../standalone_grid_canvas/standalone_grid_canvas";
import { PivotFacet } from "../pivot_facet/pivot_facet";

interface Props {}

export class PivotOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotOverlay";
  static props = { "*": Object }; // ADRM TODO
  static components = { PivotFacet, StandaloneGridCanvas };

  setup() {
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
}
