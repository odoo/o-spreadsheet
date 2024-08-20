import { PIVOT_TABLE_CONFIG } from "../../constants";
import { SpreadsheetPivotTable } from "../../helpers/pivot/table_spreadsheet_pivot";
import { getZoneArea, positionToZone } from "../../helpers/zones";
import { _t } from "../../translation";
import { HeaderIndex, PivotTableData, UID } from "../../types";
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
      case "INSERT_PIVOT_WITH_TABLE":
        this.insertPivotWithTable(cmd.sheetId, cmd.col, cmd.row, cmd.pivotId, cmd.table);
        break;
      case "SPLIT_PIVOT_FORMULA":
        this.splitPivotFormula(cmd.sheetId, cmd.col, cmd.row, cmd.pivotId, cmd.table);
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

  insertPivotWithTable(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    pivotId: UID,
    table: PivotTableData
  ) {
    const { cols, rows, measures, fieldsType } = table;
    const pivotTable = new SpreadsheetPivotTable(cols, rows, measures, fieldsType || {});
    this.resizeSheet(sheetId, col, row, pivotTable);
    const pivotFormulaId = this.getters.getPivotFormulaId(pivotId);
    this.dispatch("UPDATE_CELL", {
      sheetId,
      col,
      row,
      content: `=PIVOT(${pivotFormulaId})`,
    });
    const zone = {
      left: col,
      right: col,
      top: row,
      bottom: row,
    };

    const numberOfHeaders = pivotTable.columns.length - 1;
    this.dispatch("CREATE_TABLE", {
      tableType: "dynamic",
      sheetId,
      ranges: [this.getters.getRangeDataFromZone(sheetId, zone)],
      config: { ...PIVOT_TABLE_CONFIG, numberOfHeaders },
    });
  }

  private resizeSheet(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    table: SpreadsheetPivotTable
  ) {
    const colLimit = table.getNumberOfDataColumns() + 1; // +1 for the Top-Left
    const numberCols = this.getters.getNumberCols(sheetId);
    const deltaCol = numberCols - col;
    if (deltaCol < colLimit) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: numberCols - 1,
        sheetId: sheetId,
        quantity: colLimit - deltaCol,
        position: "after",
      });
    }
    const rowLimit = table.columns.length + table.rows.length;
    const numberRows = this.getters.getNumberRows(sheetId);
    const deltaRow = numberRows - row;
    if (deltaRow < rowLimit) {
      this.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: numberRows - 1,
        sheetId: sheetId,
        quantity: rowLimit - deltaRow,
        position: "after",
      });
    }
  }

  splitPivotFormula(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    pivotId: UID,
    pivotTableData: PivotTableData
  ) {
    this.dispatch("INSERT_PIVOT", {
      sheetId,
      col,
      row,
      pivotId,
      table: pivotTableData,
    });
    const table = this.getters.getCoreTable({ sheetId, col, row });
    if (table?.type === "dynamic") {
      const zone = positionToZone({ col, row });
      const { cols, rows, measures, fieldsType } = pivotTableData;
      const pivotTable = new SpreadsheetPivotTable(cols, rows, measures, fieldsType || {});
      const colNumber = pivotTable.getNumberOfDataColumns() + 1;
      const rowNumber = pivotTable.columns.length + pivotTable.rows.length;
      const tableZone = {
        left: col,
        top: row,
        right: col + colNumber - 1,
        bottom: row + rowNumber - 1,
      };
      const rangeData = this.getters.getRangeDataFromZone(sheetId, tableZone);
      this.dispatch("UPDATE_TABLE", {
        sheetId,
        zone,
        newTableRange: rangeData,
        tableType: "static",
      });
    }
  }
}
