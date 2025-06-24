import { Color, CoreCommand, UID } from "../..";
import { CellPosition, Style } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

interface StylePluginState {}

export class StylePlugin extends CorePlugin<StylePluginState> implements StylePluginState {
  static getters = ["getCellStyle", "getStyleCustomColor"] as const;

  handle(command: CoreCommand): void {}

  getCellStyle(cellPosition: CellPosition): Style | undefined {
    return this.getters.getCell(cellPosition)?.style;
  }

  getStyleCustomColor(sheetId: UID): Color[] {
    const cells = Object.values(this.getters.getCells(sheetId));
    const colors: Set<Color> = new Set();
    for (const cell of cells) {
      if (cell.style?.textColor) {
        colors.add(cell.style.textColor);
      }
      if (cell.style?.fillColor) {
        colors.add(cell.style.fillColor);
      }
    }
    return [...colors];
  }
}
