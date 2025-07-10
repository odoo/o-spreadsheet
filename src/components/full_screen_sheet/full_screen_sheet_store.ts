import { PIVOT_TABLE_CONFIG } from "../../constants";
import { addMissingDimensions } from "../../helpers/clipboard/clipboard_helpers";
import { SpreadsheetStore } from "../../stores";
import { _t } from "../../translation";
import { CellPosition, Command, UID } from "../../types";
import { SidePanelStore } from "../side_panel/side_panel/side_panel_store";

/**
 * ADRM TODO: full screen style : banner ? backdrop ? what do we want in topbar ?
 * ADRM TODO: after leaving full screen, what do we want to keep ? Discard pivot changes ? What if we open the full screen again ?
 *             - If we want to keep changes only when re-opening the full screen, we kinda have to duplicate the pivot then
 *             - But then what if the use modifies another pivot in fullscreen mode ?
 * ADRM TODO: what if full screen sheet already exists?
 * ADRM TODO: where exactly do we want the expand pivot icon ?
 * ADRM TODO: highlight on pivot hover ?
 * ADRM TODO: keep CFs on full screen ? Annoying to do, sometime not possible (data bar on a random range), and kinda conflicts with table style
 * ADRM TODO: do we want to keep the table style ? ATM in our dashboard there is a table with no style, so we probably don't want to keep it.
 *
 *
 *
 * ADRM TODO: the popover show fine outside of the sheet, but they disappear as soon as the mouse leave the sheet, making them unable to be clicked ...
 * ADRM TODO; on dashboard, the action is 100dvh so action + navbar is larger than the screen, so the sheet is not fully visible
 *
 */
export class FullScreenSheetStore extends SpreadsheetStore {
  mutators = ["exitFullScreen"] as const;

  fullScreenSheetId: UID | undefined = undefined;
  private originalSheetId: UID | undefined = undefined;
  sidePanelStore = this.get(SidePanelStore);

  handle(cmd: Command): void {
    switch (cmd.type) {
      case "MAKE_PIVOT_FULL_SCREEN": {
        this.model.updateMode("normal");
        this.makePivotFullScreen(cmd.pivotId, cmd);
        break;
      }
    }
  }

  private maximize(sheetId: UID) {
    this.fullScreenSheetId = sheetId;
    this.originalSheetId = this.getters.getActiveSheetId();
    this.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: this.getters.getActiveSheetId(),
      sheetIdTo: sheetId,
    });
  }

  exitFullScreen() {
    if (!this.fullScreenSheetId) {
      return "noStateChange";
    }
    this.fullScreenSheetId = undefined;
    if (this.originalSheetId) {
      this.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: this.originalSheetId,
      });
      this.originalSheetId = undefined;
    }
    this.model.updateMode("dashboard");
    return;
  }

  private makePivotFullScreen(pivotId: UID, position: CellPosition) {
    const pivotName = this.getters.getPivotName(pivotId);
    const sheetId = "full-screen-pivot" + pivotId;
    const tableConfig = this.getters.getTable(position)?.config || PIVOT_TABLE_CONFIG;

    // ADRM TODO delete this
    this.model.dispatch("DELETE_SHEET", { sheetId, sheetName: "whatever" });

    this.model.dispatch("CREATE_SHEET", {
      position: this.getters.getSheetIds().length,
      name: _t("Full screen pivot - %s", pivotName),
      sheetId: sheetId,
    });
    this.model.dispatch("HIDE_SHEET", { sheetId });
    this.maximize(sheetId);

    const pivotFormulaId = this.getters.getPivotFormulaId(pivotId);
    this.model.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      content: `=PIVOT(${pivotFormulaId})`,
    });

    this.model.dispatch("CREATE_TABLE", {
      sheetId,
      ranges: [
        this.model.getters.getRangeDataFromZone(sheetId, { left: 0, top: 0, right: 0, bottom: 0 }),
      ],
      tableType: "dynamic",
      config: tableConfig,
    });

    const pivot = this.getters.getPivot(pivotId);
    addMissingDimensions(
      this.getters,
      this.model.dispatch,
      sheetId,
      pivot.getExpandedTableStructure().numberOfColumns,
      pivot.getExpandedTableStructure().numberOfRows,
      0,
      0
    );

    this.sidePanelStore.open("PivotSidePanel", { pivotId });
  }
}
