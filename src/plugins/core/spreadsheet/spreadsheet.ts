import { isNumber } from "../../../helpers";
import {
  Cell,
  CellPosition,
  CellType,
  CoreCommand,
  Style,
  UID,
  UpdateCellCommand,
} from "../../../types";
import { CorePlugin } from "../../core_plugin";

let nextId = 1;
function getNextId(): UID {
  return (nextId++).toString();
}

interface InternalCell {
  id: UID;
  styleId?: UID;
  contentId?: UID;
  value: any;
}

abstract class Manager<T> {
  protected content: Record<UID, T> = {};

  register(element: T): UID {
    const id = getNextId();
    this.content[id] = element;
    return id;
  }

  get(id: UID): T {
    if (!(id in this.content)) {
      throw new Error(`Element not found: ${id} on ${this.constructor.name}`);
    }
    return this.content[id];
  }
}
class StyleManager extends Manager<Style> {
  register(style: Style): UID {
    const s = JSON.stringify(style);
    for (const id in this.content) {
      if (JSON.stringify(this.content[id]) === s) {
        return id;
      }
    }
    return super.register(style);
  }
}

class ContentManager extends Manager<string> {
  getType(id: UID): CellType {
    // Formula is not supported yet
    const content = this.get(id);
    if (content === "") {
      return CellType.empty;
    }
    if (isNumber(content)) {
      return CellType.number;
    }
    return CellType.text;
  }
}

export class SpreadsheetPlugin extends CorePlugin {
  private cells: Record<UID, InternalCell | undefined> = {};
  private styleManager: StyleManager = new StyleManager();
  private contentManager: ContentManager = new ContentManager();
  private position: Record<string, UID | undefined> = {};

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        this.updateCell(cmd);
        break;
    }
  }

  private getKey(position: CellPosition) {
    return JSON.stringify(position);
  }

  private createCell(): InternalCell {
    const cell = {
      id: getNextId(),
      value: "",
    };
    this.cells[cell.id] = cell;
    return cell;
  }

  private setCellPosition(cellId: UID, position: CellPosition) {
    this.position[JSON.stringify(position)] = cellId;
  }

  deleteCell(position: CellPosition) {
    const key = JSON.stringify(position);
    const cellId = this.position[key];
    if (cellId) {
      delete this.cells[cellId];
      delete this.position[key];
    }
  }

  private updateCell(cmd: UpdateCellCommand) {
    const position = { sheetId: cmd.sheetId, col: cmd.col, row: cmd.row };
    const key = JSON.stringify(position);
    const existingCellId = this.position[key];
    if (existingCellId) {
      if (cmd.content === "" && cmd.format === "" && cmd.style === null) {
        this.deleteCell(position);
        return;
      }
    } else {
      //Create a new one
      const cell = this.createCell();
      this.setCellPosition(cell.id, position);
      if (cmd.style !== undefined && cmd.style !== null) {
        cell.styleId = this.styleManager.register(cmd.style);
      }
      if (cmd.content !== undefined) {
        cell.contentId = this.contentManager.register(cmd.content);
      }
    }
  }

  getCell(position: CellPosition): Cell | undefined {
    const cellId = this.position[this.getKey(position)];
    if (!cellId) {
      return undefined;
    }
    const cell = this.cells[cellId];
    if (!cell) {
      throw new Error(`bug`);
    }
    const style = (cell.styleId !== undefined && this.styleManager.get(cell.styleId)) || undefined;
    const content = (cell.contentId !== undefined && this.contentManager.get(cell.contentId)) || "";
    return {
      ...cell,
      type: CellType.text,
      content,
      style,
    };
  }
}
