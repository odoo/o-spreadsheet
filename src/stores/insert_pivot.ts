import { PIVOT_INSERT_TABLE_STYLE_ID, PIVOT_STATIC_TABLE_CONFIG } from "../constants";
import { getUniqueText, range, sanitizeSheetName } from "../helpers/misc";
import { createPivotFormula } from "../helpers/pivot/pivot_helpers";
import { SpreadsheetPivotTable } from "../helpers/pivot/table_spreadsheet_pivot";
import { pivotTableStyleIdToTableStyleId } from "../helpers/pivot_table_presets";
import { getZoneArea, positionToZone } from "../helpers/zones";
import { _t } from "../translation";
import {
  Command,
  CommandResult,
  DispatchResult,
  DuplicatePivotInNewSheetCommand,
} from "../types/commands";
import { CellPosition, HeaderIndex, UID } from "../types/misc";
import { PivotTableData } from "../types/pivot";
import { SpreadsheetStore } from "./spreadsheet_store";

export class InsertPivotStore extends SpreadsheetStore {
  storeGetters = ["canDuplicatePivot"] as const;

  canDuplicatePivot(cmd: DuplicatePivotInNewSheetCommand): DispatchResult {
    if (!this.getters.isExistingPivot(cmd.pivotId)) {
      return new DispatchResult([CommandResult.PivotIdNotFound]);
    } else if (!this.getters.getPivot(cmd.pivotId).isValid()) {
      return new DispatchResult([CommandResult.PivotInError]);
    }
    return new DispatchResult([CommandResult.Success]);
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "INSERT_NEW_PIVOT":
        this.insertNewPivot(cmd.pivotId, cmd.newSheetId);
        break;
      case "DUPLICATE_PIVOT_IN_NEW_SHEET":
        if (this.canDuplicatePivot(cmd).isSuccessful) {
          this.duplicatePivotInNewSheet(cmd.pivotId, cmd.newPivotId, cmd.newSheetId);
        }
        break;
      case "INSERT_PIVOT_WITH_TABLE":
        this.insertPivotWithTable(
          cmd.sheetId,
          cmd.col,
          cmd.row,
          cmd.pivotId,
          cmd.table,
          cmd.pivotMode
        );
        break;
      case "SPLIT_PIVOT_FORMULA":
        this.splitPivotFormula(cmd.sheetId, cmd.col, cmd.row, cmd.pivotId);
    }
  }

  private insertNewPivot(pivotId: UID, sheetId: UID) {
    if (getZoneArea(this.getters.getSelectedZone()) === 1) {
      this.model.selection.selectTableAroundSelection();
    }
    const currentSheetId = this.getters.getActiveSheetId();
    this.model.dispatch("ADD_PIVOT", {
      pivotId,
      pivot: {
        dataSet: {
          zone: this.getters.getSelectedZone(),
          sheetId: currentSheetId,
        },
        columns: [],
        rows: [],
        measures: [],
        filters: [],
        name: _t("New pivot"),
        type: "SPREADSHEET",
        style: { tableStyleId: PIVOT_INSERT_TABLE_STYLE_ID },
      },
    });

    const position =
      this.getters.getSheetIds().findIndex((sheetId) => sheetId === currentSheetId) + 1;
    const formulaId = this.getters.getPivotFormulaId(pivotId);
    this.model.dispatch("CREATE_SHEET", {
      sheetId,
      name: _t("Pivot #%(formulaId)s", { formulaId }),
      position,
    });
    this.model.dispatch("ACTIVATE_SHEET", {
      sheetIdFrom: currentSheetId,
      sheetIdTo: sheetId,
    });
    const pivot = this.getters.getPivot(pivotId);
    this.insertPivotWithTable(
      sheetId,
      0,
      0,
      pivotId,
      pivot.getCollapsedTableStructure().export(),
      "dynamic"
    );
  }

  private duplicatePivotInNewSheet(pivotId: UID, newPivotId: UID, newSheetId: UID) {
    this.model.dispatch("DUPLICATE_PIVOT", {
      pivotId,
      newPivotId,
      duplicatedPivotName: _t("%s (copy)", this.getters.getPivotCoreDefinition(pivotId).name),
    });
    const activeSheetId = this.getters.getActiveSheetId();
    const position = this.getters.getSheetIds().indexOf(activeSheetId) + 1;
    const formulaId = this.getters.getPivotFormulaId(newPivotId);
    const newPivotName = this.getters.getPivotName(newPivotId);
    const result = this.model.dispatch("CREATE_SHEET", {
      sheetId: newSheetId,
      name: this.getPivotDuplicateSheetName(
        _t("%(newPivotName)s (Pivot #%(formulaId)s)", {
          newPivotName,
          formulaId,
        })
      ),
      position,
    });
    if (result.isSuccessful) {
      this.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: newSheetId });
      const pivot = this.getters.getPivot(pivotId);
      this.insertPivotWithTable(
        newSheetId,
        0,
        0,
        newPivotId,
        pivot.getCollapsedTableStructure().export(),
        "dynamic"
      );
    }
  }

  private getPivotDuplicateSheetName(pivotName: string) {
    const names = this.getters.getSheetIds().map((id) => this.getters.getSheetName(id));
    const sanitizedName = sanitizeSheetName(pivotName);
    return getUniqueText(sanitizedName, names);
  }

  private insertPivotWithTable(
    sheetId: UID,
    col: HeaderIndex,
    row: HeaderIndex,
    pivotId: UID,
    table: PivotTableData,
    mode: "static" | "dynamic"
  ) {
    const { cols, rows, measures, fieldsType } = table;
    const pivotTable = new SpreadsheetPivotTable(cols, rows, measures, fieldsType || {});
    const numberOfHeaders = pivotTable.columns.length - 1;
    this.resizeSheet(sheetId, col, row, pivotTable);

    if (mode === "dynamic") {
      this.model.dispatch("UPDATE_CELL", {
        sheetId,
        col,
        row,
        content: `=PIVOT(${this.getters.getPivotFormulaId(pivotId)})`,
      });
    } else {
      this.model.dispatch("INSERT_PIVOT", {
        sheetId,
        col,
        row,
        pivotId,
        table: pivotTable.export(),
      });
      const zone = {
        left: col,
        right: col + pivotTable.getNumberOfDataColumns(),
        top: row,
        bottom: row + numberOfHeaders + pivotTable.rows.length,
      };
      this.model.dispatch("CREATE_TABLE", {
        tableType: "static",
        sheetId,
        ranges: [this.getters.getRangeDataFromZone(sheetId, zone)],
        config: { ...PIVOT_STATIC_TABLE_CONFIG, numberOfHeaders },
      });
    }
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
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "COL",
        base: numberCols - 1,
        sheetId: sheetId,
        sheetName: this.getters.getSheetName(sheetId),
        quantity: colLimit - deltaCol,
        position: "after",
      });
    }
    const rowLimit = table.columns.length + table.rows.length;
    const numberRows = this.getters.getNumberRows(sheetId);
    const deltaRow = numberRows - row;
    if (deltaRow < rowLimit) {
      this.model.dispatch("ADD_COLUMNS_ROWS", {
        dimension: "ROW",
        base: numberRows - 1,
        sheetId: sheetId,
        sheetName: this.getters.getSheetName(sheetId),
        quantity: rowLimit - deltaRow,
        position: "after",
      });
    }
  }

  private splitPivotFormula(sheetId: UID, col: HeaderIndex, row: HeaderIndex, pivotId: UID) {
    const position: CellPosition = { sheetId, col, row };
    const spreadZone = this.getters.getSpreadZone(position);
    const table = this.getters.getTable(position);

    if (!spreadZone) {
      return;
    }
    const formulaId = this.getters.getPivotFormulaId(pivotId);
    const pivotInfo = this.getters.getPivotStyleAtPosition(position);
    if (!pivotInfo) {
      return;
    }

    const pivotStyle = { ...pivotInfo.pivotStyle, tabularForm: false };

    const pivot = this.getters.getPivot(pivotId);
    const pivotTable = pivot.getCollapsedTableStructure();
    const pivotCells = pivotTable.getPivotCells(pivotStyle);

    const { numberOfCols, numberOfRows } = pivotTable.getPivotTableDimensions(pivotStyle);
    if (numberOfRows === 0 || numberOfCols === 0) {
      return;
    }
    for (const i of range(0, numberOfCols)) {
      for (const j of range(0, numberOfRows)) {
        const pivotCell = pivotCells[i][j];
        if (pivotCell) {
          const position = { sheetId, col: spreadZone.left + i, row: spreadZone.top + j };
          this.model.dispatch("UPDATE_CELL", {
            ...position,
            content: createPivotFormula(formulaId, pivotCell),
          });
        }
      }
    }

    if (this.getters.getCoreTable(position)) {
      this.model.dispatch("REMOVE_TABLE", { sheetId, target: [positionToZone(position)] });
    }

    if (table?.isPivotTable) {
      const rangeData = this.getters.getRangeDataFromZone(sheetId, {
        left: spreadZone.left,
        right: spreadZone.left + numberOfCols - 1,
        top: spreadZone.top,
        bottom: spreadZone.top + numberOfRows - 1,
      });
      this.model.dispatch("CREATE_TABLE", {
        tableType: "static",
        sheetId,
        ranges: [rangeData],
        config: { ...table.config, styleId: pivotTableStyleIdToTableStyleId(table.config.styleId) },
      });
    }
  }
}
