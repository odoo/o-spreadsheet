import { Component, onWillUnmount, onWillUpdateProps, useRef } from "@odoo/owl";
import { cellPopoverRegistry } from "../../registries/cell_popovers_registry";
import { Store, useStore } from "../../store_engine";
import { CSSProperties, SpreadsheetChildEnv } from "../../types";
import { DashboardPivotFullScreenPopoverBuilder } from "../dashboard_pivot_full_screen_button/dashboard_pivot_full_screen_button";
import { cssPropertiesToCss } from "../helpers";
import { getRefBoundingRect, getSpreadsheetAsBase64 } from "../helpers/dom_helpers";
import { SpreadsheetEditor } from "../spreadsheet editor/spreadsheet editor";
import { FullScreenSheetStore } from "./full_screen_sheet_store";

cellPopoverRegistry.add("DashboardPopoverMenu", DashboardPivotFullScreenPopoverBuilder);

export class FullScreenSheet extends Component<{}, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FullScreenSheet";
  static props = {};
  static components = { SpreadsheetEditor };

  private fullScreenSheetStore!: Store<FullScreenSheetStore>;

  spreadsheetRef = useRef("fullScreenSheet");

  base64Background: string | undefined = undefined;

  setup() {
    this.fullScreenSheetStore = useStore(FullScreenSheetStore);
    // Get an image of the spreadsheet component before we went to full screen mode to use as a background
    this.base64Background = getSpreadsheetAsBase64();
    onWillUnmount(() => {
      this.fullScreenSheetStore.exitFullScreen();
    });
    onWillUpdateProps(() => {
      const fullScreenSheetId = this.fullScreenSheetStore.fullScreenSheetId;
      if (fullScreenSheetId && !this.env.model.getters.tryGetSheet(fullScreenSheetId)) {
        this.fullScreenSheetStore.exitFullScreen();
      }
    });
  }

  exitFullScreen() {
    this.fullScreenSheetStore.exitFullScreen();
    // ADRM TODO DISCUSS WITH RAR: Manually resize the sheet here avoid having a flicker when exiting the full screen, because the
    // first render has the wrong size, then the resize observer is triggered and the size is fixed for the next render.
    // Kinda ugly. Not sure if we want to keep it. Not sure what alternative we have.
    const { width, height } = getRefBoundingRect(this.spreadsheetRef);
    this.env.model.dispatch("RESIZE_SHEETVIEW", { width, height, gridOffsetX: 0, gridOffsetY: 0 });

    // TODO: we need to restore the scroll position when exiting full screen, because the sheetView will put the selection
    // back into the viewport on UNDO ... but the selection is always `0,0` in dashboard sheet.
    const originalScroll = this.fullScreenSheetStore.originalScroll;
    if (originalScroll) {
      this.env.model.dispatch("SET_VIEWPORT_OFFSET", {
        offsetX: originalScroll.scrollX,
        offsetY: originalScroll.scrollY,
      });
    }
  }

  getContainerStyle(): string {
    if (!this.base64Background) {
      return "";
    }
    const properties: CSSProperties = {};
    properties["background-image"] = `url(${this.base64Background})`;
    return cssPropertiesToCss(properties);
  }
}
