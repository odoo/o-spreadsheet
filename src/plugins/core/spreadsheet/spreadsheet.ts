import { isDefined, toCartesian, toXC } from "../../../helpers";
import {
  ApplyRangeChange,
  Cell,
  CellData,
  CellPosition,
  CellType,
  CoreCommand,
  Style,
  UID,
  UpdateCellCommand,
  WorkbookData,
} from "../../../types";
import { InternalCell } from "../../../types/spreadsheet_core";
import { CorePlugin } from "../../core_plugin";
import { ContentManager } from "./contentManager";
import { FormatManager } from "./formatManager";
import { getNextId } from "./manager";
import { StyleManager } from "./styleManager";

const nbspRegexp = new RegExp(String.fromCharCode(160), "g");

interface CoreState {
  readonly cells: Record<UID, InternalCell | undefined>;
  readonly position: Record<string, UID | undefined>;
}

export class SpreadsheetPlugin extends CorePlugin<CoreState> implements CoreState {
  readonly cells: Record<UID, InternalCell | undefined> = {};
  readonly position: Record<string, UID | undefined> = {};

  private styleManager: StyleManager = new StyleManager(this.getters);
  private contentManager: ContentManager = new ContentManager(this.getters);
  private formatManager: FormatManager = new FormatManager(this.getters);

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID) {
    for (const cell of Object.values(this.cells).filter(isDefined)) {
      const content = this.contentManager.get(cell.id);
      if (content.type === CellType.formula) {
        for (const range of content.dependencies) {
          if (!sheetId || range.sheetId === sheetId) {
            const change = applyChange(range);
            if (change.changeType !== "NONE") {
              content.dependencies[content.dependencies.indexOf(range)] = change.range; //TODO Handle history
            }
          }
        }
      }
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        this.updateCell(cmd);
        break;
    }
  }

  private createCell(position: CellPosition): InternalCell {
    const cell = {
      id: getNextId(),
      value: "",
    };
    this.history.update("cells", cell.id, cell);
    this.setCellPosition(cell.id, position);
    return cell;
  }

  private setCellPosition(cellId: UID, position: CellPosition) {
    this.history.update("position", JSON.stringify(position), cellId);
  }

  deleteCell(position: CellPosition) {
    const key = JSON.stringify(position);
    const cellId = this.position[key];
    if (cellId) {
      this.history.update("cells", cellId, undefined);
      this.history.update("position", key, undefined);
    }
  }

  private updateCell(cmd: UpdateCellCommand) {
    const position = { sheetId: cmd.sheetId, col: cmd.col, row: cmd.row };
    const key = JSON.stringify(position);
    const existingCellId = this.position[key];
    const cell = existingCellId ? this.cells[existingCellId] : this.createCell(position);
    if (!cell) {
      throw new Error("The cell should not be empty at this point");
    }
    if (cmd.style !== undefined && cmd.style !== null) {
      cell.styleId = this.styleManager.register(cmd.style);
    }
    const text = cmd.content ? cmd.content.replace(nbspRegexp, "") : "";
    cell.contentId = this.contentManager.register({ text }, cmd.sheetId);
    if (cmd.format === undefined) {
      cell.formatId = this.formatManager.getDefaultFormat(this.contentManager.get(cell.id));
    } else {
      cell.formatId = this.formatManager.register(cmd.format);
    }
    if (this.isEmpty(cell)) {
      this.deleteCell(position);
    }
  }

  isEmpty(cell: InternalCell) {
    return !cell.contentId && !cell.formatId && !cell.styleId;
  }

  getCell(position: CellPosition): Cell | undefined {
    const cellId = this.position[JSON.stringify(position)];
    if (!cellId) {
      return undefined;
    }
    const cell = this.cells[cellId];
    if (!cell) {
      throw new Error(`bug`);
    }
    const style = (cell.styleId !== undefined && this.styleManager.get(cell.styleId)) || undefined;
    const content =
      (cell.contentId !== undefined && this.contentManager.getValue(cell.contentId)) || "";
    return {
      ...cell,
      type: CellType.text,
      content: content,
      style,
      format: cell.formatId ? this.formatManager.get(cell.formatId) : undefined,
    };
  }

  import(data: WorkbookData) {
    for (let sheet of data.sheets) {
      for (let xc in sheet.cells) {
        const cell = sheet.cells[xc];
        const [col, row] = toCartesian(xc);
        const style = (cell && cell.style && data.styles[cell.style]) || undefined;
        this.updateCell({
          type: "UPDATE_CELL",
          sheetId: sheet.id,
          col,
          row,
          content: cell?.content,
          // formula: cell?.formula,
          format: cell?.format,
          style,
        });
      }
    }
  }

  export(data: WorkbookData) {
    let styleId = 0;
    const styles: { [styleId: number]: Style } = {};
    /**
     * Get the id of the given style. If the style does not exist, it creates
     * one.
     */
    function getStyleId(style: Style) {
      for (let [key, value] of Object.entries(styles)) {
        if (JSON.stringify(value) === JSON.stringify(style)) {
          return parseInt(key, 10);
        }
      }
      styles[++styleId] = style;
      return styleId;
    }
    for (let _sheet of data.sheets) {
      const cells: { [key: string]: CellData } = {};
      for (let [cellId, cell] of Object.entries(this.cells[_sheet.id] || {})) {
        let position: CellPosition = this.getters.getCellPosition(cellId);
        let xc = toXC(position.col, position.row);

        cells[xc] = {
          style: cell.style && getStyleId(cell.style),
          format: cell.format,
        };

        switch (cell.type) {
          case CellType.formula:
            cells[xc].formula = {
              text: cell.formula.text || "",
              dependencies:
                cell.dependencies?.map((d) => this.getters.getRangeString(d, _sheet.id)) || [],
            };
            break;
          case CellType.number:
          case CellType.text:
          case CellType.invalidFormula:
            cells[xc].content = cell.content;
            break;
        }
      }
      _sheet.cells = cells;
    }
    data.styles = styles;
  }
}
