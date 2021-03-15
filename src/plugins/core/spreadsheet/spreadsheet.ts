import { toXC, uuidv4 } from "../../../helpers";
import { Cell, CellPosition, CellType, CoreCommand, EmptyCell, Style, UID, UpdateCellCommand } from "../../../types";
import { CorePlugin } from "../../core_plugin";

class StyleManager {
    private styles: Style[] = [];

    registerStyle(style: Style) {
        const s = JSON.stringify(style);
        for (const id in this.styles) {
            if (JSON.stringify(this.styles[id]) === s) {
                return parseInt(id, 10);
            }
        }
        return this.styles.push(style) - 1;
    }

    getStyle(id: number): Style {
        if (!(id in this.styles)) {
            throw new Error(`Asking for a non-existing style: ${id}`);
        }
        return this.styles[id];
    }
}

class ContentManager {
    private contents: string[] = [""]//string or Formula or whatever we want

    registerContent(content: string): { type: CellType, id: number} {
        if (content === "") {
            return { type: CellType.empty, id: 0};
        }
        // Compute here the type of the cell
        const id = this.contents.push(content) - 1;
        return { type: CellType.text, id};
    }

    getContent(id: number): string {
        if (!(id in this.contents)) {
            throw new Error(`Asking for a non-existing content: ${id}`);
        }
        return this.contents[id];
    }
}


export class SpreadsheetPlugin extends CorePlugin {
  private cells: Record<UID, Cell | undefined> = {};
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

  private updateCell(cmd: UpdateCellCommand) {
      const sheetId = cmd.sheetId;
      const col = cmd.col;
      const row = cmd.row;
      const key = this.getKey({sheetId, col, row});
      const existingCellId = this.position[key];
      if (existingCellId) {

      } else {
          //Create a new one
          const id = uuidv4();
          const cell: Cell = {
              id,
              type: CellType.empty,
              value: ""
          }
          this.cells[id] = cell;
          this.position[key] = id;
          if (cmd.style) {
              const id = this.styleManager.registerStyle(cmd.style);
              //@ts-ignore
              cell.styleId = id;
          }
          if (cmd.content) {
              const { type, id } = this.contentManager.registerContent(cmd.content);
              //@ts-ignore
              cell.contentId = id;
              //@ts-ignore
              cell.type = type;
          }
      }
  }

  getCell(position: CellPosition): Cell {
    const cellId = this.position[this.getKey(position)];
    if (!cellId) {
        throw new Error(`Asking for a non-existing cell: ${position.sheetId} - ${toXC(position.col, position.row)}`);
    }
    const cell = this.cells[cellId];
    if (!cell) {
        throw new Error(`bug`);
    }
    //@ts-ignore
    const style = cell.styleId && this.styleManager.getStyle(cell.styleId);
    //@ts-ignore
    const content = cell.contentId && this.contentManager.
    return {
        ...cell,
        style
    }
  }
}
