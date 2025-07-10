import {
  Component,
  onMounted,
  onWillUnmount,
  useEffect,
  useExternalListener,
  useRef,
} from "@odoo/owl";
import { GROUP_LAYER_WIDTH, SCROLLBAR_WIDTH } from "../../constants";
import { Model } from "../../model";
import { Store, useStore } from "../../store_engine";
import { CSSProperties, HeaderGroup, Pixel, SpreadsheetChildEnv } from "../../types";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { SpreadsheetDashboard } from "../dashboard/dashboard";
import { Grid } from "../grid/grid";
import { HeaderGroupContainer } from "../header_group/header_group_container";
import { cssPropertiesToCss } from "../helpers/css";
import { getRefBoundingRect } from "../helpers/dom_helpers";
import { DEFAULT_SIDE_PANEL_SIZE, SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { SidePanels } from "../side_panel/side_panels/side_panels";
import { SmallBottomBar } from "../small_bottom_bar/small_bottom_bar";
import { TopBar } from "../top_bar/top_bar";

export class SpreadsheetEditor extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetEditor";
  static props = {};
  static components = {
    TopBar,
    Grid,
    BottomBar,
    SmallBottomBar,
    SidePanels,
    SpreadsheetDashboard,
    HeaderGroupContainer,
  };

  sidePanel!: Store<SidePanelStore>;
  spreadsheetRef = useRef("spreadsheetEditor");

  private _focusGrid?: () => void;

  get model(): Model {
    return this.env.model;
  }

  getStyle(): string {
    const properties: CSSProperties = {};
    if (this.env.isDashboard()) {
      properties["grid-template-rows"] = `auto`;
    } else {
      properties["grid-template-rows"] = `min-content auto min-content`;
    }
    const columnWidth = this.sidePanel.mainPanel
      ? `${this.sidePanel.totalPanelSize || DEFAULT_SIDE_PANEL_SIZE}px`
      : "auto";
    properties["grid-template-columns"] = `auto ${columnWidth}`;

    return cssPropertiesToCss(properties);
  }

  setup() {
    this.sidePanel = useStore(SidePanelStore);

    useEffect(
      () => {
        /**
         * Only refocus the grid if the active element is not a child of the spreadsheet
         * (i.e. activeElement is outside of the spreadsheetRef component)
         * and spreadsheet is a child of that element. Anything else means that the focus
         * is on an element that needs to keep it.
         */
        if (
          !this.spreadsheetRef.el?.contains(document.activeElement) &&
          document.activeElement?.contains(this.spreadsheetRef.el!)
        ) {
          this.focusGrid();
        }
      },
      () => [this.env.model.getters.getActiveSheetId()]
    );

    useExternalListener(window, "resize", () => this.render(true));
    // For some reason, the wheel event is not properly registered inside templates
    // in Chromium-based browsers based on chromium 125
    // This hack ensures the event declared in the template is properly registered/working
    useExternalListener(document.body, "wheel", () => {});

    onMounted(() => {
      resizeObserver.observe(this.spreadsheetRef.el!);
    });
    onWillUnmount(() => {
      resizeObserver.disconnect();
    });
    const resizeObserver = new ResizeObserver(() => {
      this.sidePanel.changeSpreadsheetWidth(getRefBoundingRect(this.spreadsheetRef).width);
    });
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
