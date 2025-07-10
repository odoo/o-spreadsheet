import { Component, useRef } from "@odoo/owl";
import { GROUP_LAYER_WIDTH, SCROLLBAR_WIDTH } from "../../constants";
import { Store, useStore } from "../../store_engine";
import { CSSProperties, HeaderGroup, Pixel, SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers";
import { DEFAULT_SIDE_PANEL_SIZE, SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { SpreadsheetEditor } from "../spreadsheet editor/spreadsheet editor";
import { FullScreenSheetStore } from "./full_screen_sheet_store";

export class FullScreenSheet extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenSheet";
  static props = {};
  static components = { SpreadsheetEditor };

  private fullScreenSheetStore!: Store<FullScreenSheetStore>;
  sidePanel!: Store<SidePanelStore>;
  private _focusGrid?: () => void;

  spreadsheetRef = useRef("fullScreenSheet");

  setup() {
    this.fullScreenSheetStore = useStore(FullScreenSheetStore);
    this.sidePanel = useStore(SidePanelStore);
  }

  exitFullScreen() {
    this.fullScreenSheetStore.exitFullScreen();
  }

  getStyle(): string {
    const properties: CSSProperties = {};
    properties["grid-template-rows"] = `min-content 1fr`;

    const columnWidth = this.sidePanel.mainPanel
      ? `${this.sidePanel.totalPanelSize || DEFAULT_SIDE_PANEL_SIZE}px`
      : "auto";
    properties["grid-template-columns"] = `auto ${columnWidth}`;

    return cssPropertiesToCss(properties);
  }

  focusGrid() {
    if (!this._focusGrid) {
      return;
    }
    this._focusGrid();
  }

  get gridHeight(): Pixel {
    return this.env.model.getters.getSheetViewDimension().height;
  }

  get gridContainerStyle(): string {
    const gridColSize = GROUP_LAYER_WIDTH * this.rowLayers.length;
    const gridRowSize = GROUP_LAYER_WIDTH * this.colLayers.length;
    return cssPropertiesToCss({
      "grid-template-columns": `${gridColSize ? gridColSize + 2 : 0}px auto`, // +2: margins
      "grid-template-rows": `${gridRowSize ? gridRowSize + 2 : 0}px auto`,
    });
  }

  get rowLayers(): HeaderGroup[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getVisibleGroupLayers(sheetId, "ROW");
  }

  get colLayers(): HeaderGroup[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getVisibleGroupLayers(sheetId, "COL");
  }

  getGridSize() {
    const topBarHeight =
      this.spreadsheetRef.el
        ?.querySelector(".o-spreadsheet-topbar-wrapper")
        ?.getBoundingClientRect().height || 0;
    const bottomBarHeight =
      this.spreadsheetRef.el
        ?.querySelector(".o-spreadsheet-bottombar-wrapper")
        ?.getBoundingClientRect().height || 0;

    const gridWidth =
      this.spreadsheetRef.el?.querySelector(".o-grid")?.getBoundingClientRect().width || 0;
    const gridHeight =
      (this.spreadsheetRef.el?.getBoundingClientRect().height || 0) -
      (this.spreadsheetRef.el?.querySelector(".o-column-groups")?.getBoundingClientRect().height ||
        0) -
      topBarHeight -
      bottomBarHeight;
    return {
      width: Math.max(gridWidth - SCROLLBAR_WIDTH, 0),
      height: Math.max(gridHeight - SCROLLBAR_WIDTH, 0),
    };
  }
}
