import { getZoneArea } from "../../helpers/zones";
import { _t } from "../../translation";
import { UID } from "../../types";
import { Command } from "../../types/commands";
import { UIPlugin } from "../ui_plugin";

export class InsertPivotPlugin extends UIPlugin {
  static getters = [] as const;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "INSERT_NEW_PIVOT":
        this.insertNewPivot(cmd.pivotId, cmd.newSheetId);
        break;
      case "DUPLICATE_PIVOT_IN_NEW_SHEET":
        this.duplicatePivotInNewSheet(cmd.pivotId, cmd.newPivotId, cmd.newSheetId);
        break;
    }
  }

  private insertNewPivot(pivotId: UID, sheetId: UID) {
    if (getZoneArea(this.getters.getSelectedZone()) === 1) {
      this.selection.selectTableAroundSelection();
    }
    const currentSheetId = this.getters.getActiveSheetId();
    this.dispatch("ADD_PIVOT", {
      pivotId,
      pivot: {
        dataSet: {
          zone: this.getters.getSelectedZone(),
          sheetId: currentSheetId,
        },
        columns: [],
        rows: [],
        measures: [],
        name: _t("New pivot"),
        type: "SPREADSHEET",
      },
    });

    const position =
      this.getters.getSheetIds().findIndex((sheetId) => sheetId === currentSheetId) + 1;
    const formulaId = this.getters.getPivotFormulaId(pivotId);
    this.dispatch("CREATE_SHEET", {
      sheetId,
      name: _t("Pivot #%(formulaId)s", { formulaId }),
      position,
    });
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: currentSheetId,
      sheetIdTo: sheetId,
    });
    this.dispatch("UPDATE_CELL", {
      sheetId,
      col: 0,
      row: 0,
      content: `=PIVOT(${formulaId})`,
    });
  }

  private duplicatePivotInNewSheet(pivotId: UID, newPivotId: UID, newSheetId: UID) {
    this.dispatch("DUPLICATE_PIVOT", {
      pivotId,
      newPivotId,
    });
    const activeSheetId = this.getters.getActiveSheetId();
    const position = this.getters.getSheetIds().indexOf(activeSheetId) + 1;
    const formulaId = this.getters.getPivotFormulaId(newPivotId);
    const newPivotName = this.getters.getPivotName(newPivotId);
    this.dispatch("CREATE_SHEET", {
      sheetId: newSheetId,
      name: this.getPivotDuplicateSheetName(
        _t("%(newPivotName)s (Pivot #%(formulaId)s)", {
          newPivotName,
          formulaId,
        })
      ),
      position,
    });
    this.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: newSheetId });
    this.dispatch("UPDATE_CELL", {
      sheetId: newSheetId,
      col: 0,
      row: 0,
      content: `=PIVOT(${formulaId})`,
    });
  }

  private getPivotDuplicateSheetName(pivotName: string) {
    let i = 1;
    const names = this.getters.getSheetIds().map((id) => this.getters.getSheetName(id));
    let name = pivotName;
    while (names.includes(name)) {
      name = `${pivotName} (${i})`;
      i++;
    }
    return name;
  }
}
