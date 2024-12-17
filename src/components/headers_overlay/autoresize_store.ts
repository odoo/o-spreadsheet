import { CellPosition, Command, HeaderIndex, UID } from "../..";
import { GRID_ICON_MARGIN, ICON_EDGE_LENGTH, PADDING_AUTORESIZE_HORIZONTAL } from "../../constants";
import {
  computeIconWidth,
  computeTextWidth,
  largeMax,
  positions,
  splitTextToWidth,
} from "../../helpers";
import { SpreadsheetStore } from "../../stores";
import { GridCellIconStore } from "../grid_cell_icon_overlay/grid_cell_icon_overlay_store";

export class AutoresizeStore extends SpreadsheetStore {
  private ctx = document.createElement("canvas").getContext("2d")!;

  protected gridCellIconStore = this.get(GridCellIconStore);

  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTORESIZE_COLUMNS":
        for (let col of cmd.cols) {
          const size = this.getColMaxWidth(cmd.sheetId, col);
          if (size !== 0) {
            this.model.dispatch("RESIZE_COLUMNS_ROWS", {
              elements: [col],
              dimension: "COL",
              size,
              sheetId: cmd.sheetId,
            });
          }
        }
        break;
      case "AUTORESIZE_ROWS":
        for (let row of cmd.rows) {
          this.model.dispatch("RESIZE_COLUMNS_ROWS", {
            elements: [row],
            dimension: "ROW",
            size: null,
            sheetId: cmd.sheetId,
          });
        }
        break;
    }
  }

  getCellWidth(position: CellPosition): number {
    const style = this.getters.getCellComputedStyle(position);

    let contentWidth = 0;

    const content = this.getters.getEvaluatedCell(position).formattedValue;
    if (content) {
      const multiLineText = splitTextToWidth(this.ctx, content, style, undefined);
      contentWidth += Math.max(
        ...multiLineText.map((line) => computeTextWidth(this.ctx, line, style))
      );
    }

    const icon = this.getters.getCellIconSrc(position);
    if (icon) {
      contentWidth += computeIconWidth(style);
    }

    /** ADRM TODO: DISCUSS. This ts-ignore sucks. We don't wan't getIcon to be a mutator (we don't want a render).
     * Could call this.gridCellIconStore.icons, but this would compute the icons of all the visible cells, which is very
     * wasteful. Possible solutions:
     * 1) add a getter mechanism to stores which does not trigger a render
     * 2) cache the computed icons. The icons change based on a bunch of commands and based on the side panel opened, so
     * invalidating it is a problem. Something that clears the cache at each render ?
     * 3) don't use stores for this PR and use good ol' plugins instead. Would need a command ADD_ICON_PROVIDER, but if
     * we cannot use store for all UI related features, what's the point of having them ?
     * 4) make getIcon a mutator and trust owl and the dev. Here if owl works correctly it should be fine (command AUTORESIZE
     * already triggers a render, and I hope that multiple render(true) called in the same frame do'nt trigger multiple
     * renders). TBH I think it's a bad idea.
     * 5) make the gridCellIconStore expose the iconProviders and use non-store helpers to compute the icons.
     * 6) have autoresize ignore the pivot sort icons. Functionally why not, but we'd have 2 source of truth for the icons:
     * the gridCellIconStore and the getGridCellIcon getter. Not great.
     *
     * IMO 1) > 5) > 3)
     */
    // @ts-ignore
    const cellIcon = this.gridCellIconStore.getIcon(position);
    if (cellIcon) {
      contentWidth += ICON_EDGE_LENGTH + GRID_ICON_MARGIN;
    }

    if (contentWidth === 0) {
      return 0;
    }

    contentWidth += 2 * PADDING_AUTORESIZE_HORIZONTAL;
    if (style.wrapping === "wrap") {
      const colWidth = this.getters.getColSize(this.getters.getActiveSheetId(), position.col);
      return Math.min(colWidth, contentWidth);
    }

    return contentWidth;
  }

  private getColMaxWidth(sheetId: UID, index: HeaderIndex): number {
    const cellsPositions = positions(this.getters.getColsZone(sheetId, index, index));
    const sizes = cellsPositions.map((position) => this.getCellWidth({ sheetId, ...position }));
    return Math.max(0, largeMax(sizes));
  }
}
