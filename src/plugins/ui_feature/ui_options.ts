import { Command, Pixel, Rect } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface SheetViewState {
  viewRect: Rect;
  offset: { scrollX: Pixel; scrollY: Pixel };
}

export class UIOptionsPlugin extends UIPlugin {
  static getters = ["shouldShowFormulas", "visibleHeaders", "isPrintMode"] as const;
  private showFormulas: boolean = false;
  private printMode: boolean = false;

  sheetViewState: SheetViewState | undefined = undefined;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_FORMULA_VISIBILITY":
        this.showFormulas = cmd.show;
        break;
      case "SET_PRINT_MODE":
        this.printMode = cmd.active;
        if (cmd.active) {
          this.sheetViewState = {
            //remove fullSheetViewRect or keep in favor of printRect?
            viewRect: this.getters.getVisibleSheetViewRect(),
            offset: this.getters.getActiveSheetDOMScrollInfo(),
          };
          this.dispatch("SET_VIEWPORT_OFFSET", { offsetX: 0, offsetY: 0 });
          this.dispatch("RESIZE_SHEETVIEW", {
            ...this.getPrintRect(),
          });
        }
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  shouldShowFormulas(): boolean {
    return this.showFormulas;
  }

  visibleHeaders(): boolean {
    return !this.getters.isDashboard() && !this.printMode;
  }

  isPrintMode(): boolean {
    return this.printMode;
  }

  private getPrintRect(): Rect {
    const { x, y } = this.getters.getFullSheetViewRect();
    const sheetId = this.getters.getActiveSheetId();
    const { bottom, right } = this.getters.getSheetZone(sheetId);
    const { end: width } = this.getters.getColDimensions(sheetId, right);
    const { end: height } = this.getters.getRowDimensions(sheetId, bottom);
    return { x, y, width, height };
  }
}
