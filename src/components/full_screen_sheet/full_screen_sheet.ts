import { Component, onWillUnmount, useRef } from "@odoo/owl";
import { Store, useStore } from "../../store_engine";
import { CSSProperties, SpreadsheetChildEnv } from "../../types";
import { cssPropertiesToCss } from "../helpers";
import { getRefBoundingRect, getSpreadsheetAsBase64 } from "../helpers/dom_helpers";
import { SpreadsheetEditor } from "../spreadsheet editor/spreadsheet editor";
import { FullScreenSheetStore } from "./full_screen_sheet_store";

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
  }

  exitFullScreen() {
    this.fullScreenSheetStore.exitFullScreen();
    // ADRM TODO DISCUSS WITH RAR: Manually resize the sheet here avoid having a flicker when exiting the full screen, because the
    // first render has the wrong size, then the resize observer is triggered and the size is fixed for the next render.
    // Kinda ugly. Not sure if we want to keep it. Not sure what alternative we have.
    const { width, height } = getRefBoundingRect(this.spreadsheetRef);
    this.env.model.dispatch("RESIZE_SHEETVIEW", { width, height, gridOffsetX: 0, gridOffsetY: 0 });
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
