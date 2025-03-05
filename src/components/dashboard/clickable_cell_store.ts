import { positionToZone, positions, toXC } from "../../helpers";
import { PositionMap } from "../../plugins/ui_core_views/cell_evaluation/position_map";
import { CellClickableItem, clickableCellRegistry } from "../../registries/cell_clickable_registry";
import { SpreadsheetStore } from "../../stores/spreadsheet_store";
import {
  CellPosition,
  Command,
  Position,
  Rect,
  SpreadsheetChildEnv,
  Style,
  UID,
  invalidateEvaluationCommands,
} from "../../types";

export interface ClickableCell {
  coordinates: Rect;
  position: CellPosition;
  title: string;
  action: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) => void;
}

export class ClickableCellsStore extends SpreadsheetStore {
  mutators = ["hoverClickableCell"] as const;
  private _clickableCells: Record<UID, Record<string, CellClickableItem>> = {};

  hoveredCol: number | undefined;
  hoveredRow: number | undefined;

  hoverStyles: PositionMap<Style> = new PositionMap();

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      cmd.type === "EVALUATE_CELLS" ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this._clickableCells = {};
    }
  }

  hoverClickableCell({ col, row }: Partial<Position>) {
    this.hoveredCol = col;
    this.hoveredRow = row;
    this.hoverStyles = new PositionMap();
    if (col === undefined || row === undefined) {
      return;
    }
    const sheetId = this.getters.getActiveSheetId();
    const position = { sheetId, col, row };
    const item = this.getClickableItem(position);
    const hoverStyles = item?.hoverStyle?.(position, this.getters);
    for (const hoverStyle of hoverStyles || []) {
      for (const position of positions(hoverStyle.zone)) {
        const positionWithSheet = { ...position, sheetId };
        this.hoverStyles.set(positionWithSheet, {
          ...this.hoverStyles.get(positionWithSheet),
          ...hoverStyle.style,
        });
      }
    }
  }

  private getRegistryItems() {
    return clickableCellRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
  }

  private getClickableItem(position: CellPosition): CellClickableItem | undefined {
    const { sheetId, col, row } = position;
    const clickableCells = this._clickableCells;
    const xc = toXC(col, row);
    if (!clickableCells[sheetId]) {
      clickableCells[sheetId] = {};
    }
    if (!(xc in clickableCells[sheetId]!)) {
      const clickableCell = this.findClickableItem(position);
      if (clickableCell) {
        clickableCells[sheetId][xc] = clickableCell;
      }
    }
    return clickableCells[sheetId][xc];
  }

  private findClickableItem(position: CellPosition) {
    const getters = this.getters;
    for (const item of this.getRegistryItems()) {
      if (item.condition(position, getters)) {
        return item;
      }
    }
    return undefined;
  }

  get clickableCells(): ClickableCell[] {
    const cells: ClickableCell[] = [];
    const getters = this.getters;
    const sheetId = getters.getActiveSheetId();
    for (const position of this.getters.getVisibleCellPositions()) {
      const item = this.getClickableItem(position);
      if (!item) {
        continue;
      }
      const zone = getters.expandZone(sheetId, positionToZone(position));
      cells.push({
        coordinates: getters.getVisibleRect(zone),
        position,
        action: item.execute,
        title: item.title || "",
      });
    }
    return cells;
  }
}
