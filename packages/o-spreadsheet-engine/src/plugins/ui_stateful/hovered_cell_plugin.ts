import { Command } from "../../types/commands";
import { CellPosition } from "../../types/misc";
import { UIPlugin } from "../ui_plugin";

export class HoveredCellPlugin extends UIPlugin {
  static getters = ["getHoveredCell"] as const;

  private hoveredCell: CellPosition | undefined = undefined;

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_HOVERED_CELL":
        this.hoveredCell = cmd.cellPosition;
        break;
    }
  }
  getHoveredCell(): CellPosition | undefined {
    return this.hoveredCell;
  }
}
