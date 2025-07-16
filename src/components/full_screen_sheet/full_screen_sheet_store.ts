import { PIVOT_TABLE_CONFIG } from "../../constants";
import { range, UuidGenerator } from "../../helpers";
import { addMissingDimensions } from "../../helpers/clipboard/clipboard_helpers";
import { SpreadsheetStore } from "../../stores";
import { Command, SheetDOMScrollInfo, UID } from "../../types";
import { SidePanelStore } from "../side_panel/side_panel/side_panel_store";

export class FullScreenSheetStore extends SpreadsheetStore {
  mutators = ["exitFullScreen", "makePivotFullScreen"] as const;

  fullScreenSheetId: UID | undefined = undefined;

  private originalSheetId: UID | undefined = undefined;
  originalScroll: SheetDOMScrollInfo | undefined = undefined;

  private sidePanelStore = this.get(SidePanelStore);

  handle(cmd: Command): void {
    switch (cmd.type) {
      case "MAKE_PIVOT_FULL_SCREEN": {
        this.model.updateMode("normal");
        this._makePivotFullScreen(cmd.pivotId);
        break;
      }
      case "EXIT_FULL_SCREEN": {
        this._exitFullScreen();
        break;
      }
    }
  }

  private maximize(sheetId: UID) {
    this.originalSheetId = this.getters.getActiveSheetId();
    this.originalScroll = this.getters.getActiveSheetScrollInfo();
    this.fullScreenSheetId = sheetId;
    this.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.originalSheetId,
      sheetIdTo: sheetId,
    });
  }

  makePivotFullScreen(pivotId: UID) {
    this.model.dispatch("MAKE_PIVOT_FULL_SCREEN", { pivotId });
    // AUTORESIZE in separate command because we need to wait for a finalize() to have an evaluation
    if (this.fullScreenSheetId) {
      const cols = this.getters.getPivot(pivotId).getExpandedTableStructure().numberOfColumns;
      this.model.dispatch("AUTORESIZE_COLUMNS", {
        sheetId: this.fullScreenSheetId,
        cols: range(0, cols - 1),
      });
    }
  }

  exitFullScreen() {
    if (!this.fullScreenSheetId) {
      return "noStateChange";
    }
    this.model.dispatch("EXIT_FULL_SCREEN");
    return;
  }

  _exitFullScreen() {
    this.restoreState();
    this.model.updateMode("dashboard");
    return;
  }

  private restoreState() {
    if (this.fullScreenSheetId) {
      while (this.getters.tryGetSheet(this.fullScreenSheetId)) {
        this.model.dispatch("REQUEST_UNDO");
      }
      this.fullScreenSheetId = undefined;
    }
    if (this.originalSheetId) {
      this.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: this.originalSheetId,
      });
      this.originalSheetId = undefined;
    }
  }

  private _makePivotFullScreen(pivotId: UID) {
    const sheetId = new UuidGenerator().smallUuid();

    this.model.dispatch("CREATE_SHEET", {
      position: this.getters.getSheetIds().length,
      name: this.getters.getNextSheetName(),
      sheetId: sheetId,
    });
    this.maximize(sheetId);

    const pivotFormulaId = this.getters.getPivotFormulaId(pivotId);
    this.model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      content: `=PIVOT(${pivotFormulaId})`,
    });

    const tableZone = { left: 0, top: 0, right: 0, bottom: 0 };
    this.model.dispatch("CREATE_TABLE", {
      sheetId,
      ranges: [this.model.getters.getRangeDataFromZone(sheetId, tableZone)],
      tableType: "dynamic",
      config: PIVOT_TABLE_CONFIG,
    });

    const pivot = this.getters.getPivot(pivotId);
    addMissingDimensions(
      this.getters,
      this.model.dispatch,
      sheetId,
      Math.max(pivot.getExpandedTableStructure().numberOfColumns, 300),
      Math.max(pivot.getExpandedTableStructure().numberOfRows, 300),
      0,
      0
    );

    this.sidePanelStore.open("PivotSidePanel", { pivotId });
  }
}
