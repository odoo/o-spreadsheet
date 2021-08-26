import {
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../constants";
import { findCellInNewZone, findLastVisibleColRow, getNextVisibleCellCoords } from "../../helpers";
import { Mode } from "../../model";
import {
  Command,
  CommandResult,
  Sheet,
  UID,
  Viewport,
  Zone,
  ZoneDimension,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

interface ViewportPluginState {
  readonly viewports: Record<UID, Viewport>;
}

/**
 * Viewport plugin.
 *
 * This plugin manages all things related to all viewport states.
 *
 * There are two types of viewports :
 *  1. The viewport related to the scrollbar absolute position
 *  2. The snappedViewport which represents the previous one but but 'snapped' to
 *     the col/row structure, so, the offsets are correct for computations necessary
 *     to align elements to the grid.
 */
export class ViewportPlugin extends UIPlugin {
  static getters = [
    "getActiveViewport",
    "getSnappedViewport",
    "getActiveSnappedViewport",
    "getViewportDimension",
    "getViewportDimension2",
    "getGridDimension",
  ];
  static modes: Mode[] = ["normal"];

  readonly viewports: ViewportPluginState["viewports"] = {};
  private oldSelectedZone: Zone = { left: 0, right: 0, top: 0, bottom: 0 };
  // readonly snappedViewports: ViewportPluginState["viewports"] = {};
  // private updateSnap: boolean = false;
  /**
   * The viewport dimensions (clientWidth and clientHeight) are usually set by one of the components
   * (i.e. when grid component is mounted) to properly reflect its state in the DOM.
   * In the absence of a component (standalone model), is it mandatory to set reasonable default values
   * to ensure the correct operation of this plugin.
   */
  private offsetWidth: number = 1000;
  private offsetHeight: number = 1000;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "SET_VIEWPORT_OFFSET":
        return this.checkOffsetValidity(cmd.offsetX, cmd.offsetY);
      case "RESIZE_VIEWPORT":
        if (cmd.width < 0 || cmd.height < 0) {
          return CommandResult.InvalidViewportSize;
        }
        return CommandResult.Success;
      default:
        return CommandResult.Success;
    }
  }

  beforeHandle(cmd: Command) {
    switch (cmd.type) {
      case "ALTER_SELECTION":
        if (cmd.delta) {
          this.oldSelectedZone = this.getters.getSelectedZone();
        }
    }
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
        this.cleanViewports();
        this.resetViewports();
        this.scroll(this.getters.getActiveSheetId());
        break;
      case "RESIZE_VIEWPORT":
        this.cleanViewports();
        this.resizeViewport(cmd.height, cmd.width);
        this.scroll(this.getters.getActiveSheetId());
        break;
      case "SET_VIEWPORT_OFFSET":
        this.setViewportOffset(cmd.offsetX, cmd.offsetY);
        break;
      case "REMOVE_COLUMNS_ROWS":
      case "RESIZE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.adjustViewportOffsetX(cmd.sheetId, this.getViewport(cmd.sheetId));
        } else {
          this.adjustViewportOffsetY(cmd.sheetId, this.getViewport(cmd.sheetId));
        }
        this.scroll(cmd.sheetId);
        break;
      case "ADD_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
        if (cmd.dimension === "COL") {
          this.adjustViewportZoneX(cmd.sheetId, this.getViewport(cmd.sheetId));
        } else {
          this.adjustViewportZoneY(cmd.sheetId, this.getViewport(cmd.sheetId));
        }
        this.scroll(cmd.sheetId);
        break;
      case "ACTIVATE_SHEET":
        this.refreshViewport(cmd.sheetIdTo);
        this.scroll(cmd.sheetIdTo);
        break;
      case "SELECT_CELL":
      case "MOVE_POSITION":
        const sheetId = this.getters.getActiveSheetId();
        this.refreshViewport(sheetId);
        this.scroll(sheetId);
        break;
      case "ALTER_SELECTION":
        if (cmd.delta) {
          const sheetId2 = this.getters.getActiveSheetId();
          const newZone = this.getters.getSelectedZone();
          const position = findCellInNewZone(
            this.oldSelectedZone,
            newZone,
            this.getActiveViewport()
          );
          this.adjustViewportsPosition(sheetId2, position);
          this.scroll(sheetId2);
        }
        break;
    }
  }

  scroll(sheetId: UID) {
    const { offsetX, offsetY } = this.getViewport(sheetId);
    this.ui.trigger("tabouret", { offsetX, offsetY });
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  getViewportDimension(): ZoneDimension {
    return { width: this.offsetWidth, height: this.offsetHeight };
  }

  getViewportDimension2(sheet: Sheet): ZoneDimension {
    const parentDiv = document.createElement("div");
    parentDiv.style.height = `${this.offsetHeight}`;
    parentDiv.style.top = `${-2 * this.offsetHeight}`;
    parentDiv.style.width = `${this.offsetWidth}`;
    parentDiv.style.left = `${-2 * this.offsetWidth}`;
    parentDiv.style.overflow = "scroll";
    const overflowDiv = document.createElement("div");
    parentDiv.appendChild(overflowDiv);
    document.querySelector("body")!.appendChild(parentDiv);
    overflowDiv.style.height = `${sheet.rows[sheet.rows.length - 1].end}`;
    overflowDiv.style.width = `${sheet.cols[sheet.cols.length - 1].end}`;
    const res = { width: parentDiv.clientWidth, height: parentDiv.clientHeight };
    document.querySelector("body")!.removeChild(parentDiv);
    return res;
  }

  getActiveViewport(): Viewport {
    const sheetId = this.getters.getActiveSheetId();
    return this.getViewport(sheetId);
  }

  getActiveSnappedViewport(): Viewport {
    // const sheetId = this.getters.getActiveSheetId();
    // return this.getSnappedViewport(sheetId);
    return this.getActiveViewport();
  }

  getGridDimension(sheet: Sheet): ZoneDimension {
    const lastCol = findLastVisibleColRow(sheet, "cols");
    const lastRow = findLastVisibleColRow(sheet, "rows");
    // return {
    //   width: sheet.cols[sheet.cols.length - 1].end,
    //   height: sheet.rows[sheet.rows.length - 1].end,
    // };
    // const effectiveWidth = this.offsetWidth - HEADER_WIDTH;
    // const effectiveHeight = this.offsetHeight - HEADER_HEIGHT;
    const { width: effectiveWidth, height: effectiveHeight } = this.getViewportDimension();

    const leftCol =
      sheet.cols.find((col) => col.end > lastCol!.end - effectiveWidth) ||
      sheet.cols[sheet.cols.length - 1];
    const topRow =
      sheet.rows.find((row) => row.end > lastRow!.end - effectiveHeight) ||
      sheet.rows[sheet.rows.length - 1];

    const width =
      lastCol!.end +
      Math.max(DEFAULT_CELL_WIDTH, Math.min(leftCol.size, effectiveWidth - lastCol!.size));
    const height =
      lastRow!.end +
      Math.max(DEFAULT_CELL_HEIGHT + 5, Math.min(topRow.size, effectiveHeight - lastRow!.size));

    return { width, height };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private checkOffsetValidity(offsetX: number, offsetY: number): CommandResult {
    // TODO : le +1 dans la contrainte sert a adresser les valeurs d'offset un peu louches
    //  -> il faudrait tenter de formaliser à ça
    //  -> Est-ce que c'est pas mieux de parler de partie entière de l'offset proposé ?
    const { width, height } = this.getters.getGridDimension(this.getters.getActiveSheet());
    if (
      offsetX < 0 ||
      offsetY < 0 ||
      this.offsetHeight - HEADER_HEIGHT + offsetY > height + 1 ||
      this.offsetWidth - HEADER_WIDTH + offsetX > width + 1
    ) {
      return CommandResult.InvalidOffset;
    }
    return CommandResult.Success;
  }

  getSnappedViewport(sheetId: UID) {
    // this.snapViewportToCell(sheetId);
    // return this.snappedViewports[sheetId];
    return this.getViewport(sheetId);
  }

  private getViewport(sheetId: UID): Viewport {
    if (!this.viewports[sheetId]) {
      return this.generateViewportState(sheetId);
    }
    return this.viewports[sheetId];
  }

  /** gets rid of deprecated sheetIds */
  private cleanViewports() {
    const sheets = this.getters.getVisibleSheets();
    for (let sheetId of Object.keys(this.viewports)) {
      if (!sheets.includes(sheetId)) {
        delete this.viewports[sheetId];
      }
    }
  }

  private resetViewports() {
    for (let [sheetId, viewport] of Object.entries(this.viewports)) {
      this.adjustViewportOffsetX(sheetId, viewport);
      this.adjustViewportOffsetY(sheetId, viewport);
      this.adjustViewportsPosition(sheetId);
    }
  }

  /** Corrects the viewport's horizontal offset based on the current structure
   *  To make sure that at least on column is visible inside the viewport.
   */
  private adjustViewportOffsetX(sheetId: UID, viewport: Viewport) {
    const { offsetX } = viewport;
    const { width: sheetWidth } = this.getGridDimension(this.getters.getSheet(sheetId));
    if (this.offsetWidth - HEADER_WIDTH + offsetX > sheetWidth) {
      const diff = this.offsetWidth - HEADER_WIDTH + offsetX - sheetWidth;
      viewport.offsetX = Math.max(0, offsetX - diff);
    }
    this.adjustViewportZoneX(sheetId, viewport);
  }

  /** Corrects the viewport's vertical offset based on the current structure
   *  To make sure that at least on row is visible inside the viewport.
   */
  private adjustViewportOffsetY(sheetId: UID, viewport: Viewport) {
    const { offsetY } = viewport;
    const { height: sheetHeight } = this.getGridDimension(this.getters.getSheet(sheetId));
    if (this.offsetHeight - HEADER_HEIGHT + offsetY > sheetHeight) {
      const diff = this.offsetHeight - HEADER_HEIGHT + offsetY - sheetHeight;
      viewport.offsetY = Math.max(0, offsetY - diff);
    }
    this.adjustViewportZoneY(sheetId, viewport);
  }

  private resizeViewport(height: number, width: number) {
    this.offsetHeight = height;
    this.offsetWidth = width;
    this.recomputeViewports();
  }

  private recomputeViewports() {
    for (let sheetId of Object.keys(this.viewports)) {
      this.adjustViewportOffsetX(sheetId, this.viewports[sheetId]);
      this.adjustViewportOffsetY(sheetId, this.viewports[sheetId]);
    }
  }

  private setViewportOffset(offsetX: number, offsetY: number) {
    const sheetId = this.getters.getActiveSheetId();
    this.getActiveViewport();
    this.viewports[sheetId].offsetX = offsetX;
    this.viewports[sheetId].offsetY = offsetY;
    this.adjustViewportZone(sheetId, this.viewports[sheetId]);
  }

  private generateViewportState(sheetId: UID): Viewport {
    this.viewports[sheetId] = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      offsetX: 0,
      offsetY: 0,
    };
    return this.viewports[sheetId];
  }

  private refreshViewport(sheetId: UID) {
    const viewport = this.getViewport(sheetId);
    this.adjustViewportZone(sheetId, viewport);
    this.adjustViewportsPosition(sheetId);
  }

  private adjustViewportZone(sheetId: UID, viewport: Viewport) {
    this.adjustViewportZoneX(sheetId, viewport);
    this.adjustViewportZoneY(sheetId, viewport);
  }

  /** Updates the viewport zone based on its horizontal offset (will find Left) and its width (will find Right) */
  private adjustViewportZoneX(sheetId: UID, viewport: Viewport) {
    const sheet = this.getters.getSheet(sheetId);
    const cols = sheet.cols;
    viewport.left = this.getters.getColIndex(viewport.offsetX + HEADER_WIDTH, 0, sheet);
    const x = this.offsetWidth + viewport.offsetX;
    viewport.right = cols.length - 1;
    for (let i = viewport.left; i < cols.length; i++) {
      if (x < cols[i].end) {
        viewport.right = i;
        break;
      }
    }
  }

  /** Updates the viewport zone based on its vertical offset (will find Top) and its width (will find Bottom) */
  private adjustViewportZoneY(sheetId: UID, viewport: Viewport) {
    const sheet = this.getters.getSheet(sheetId);
    const rows = sheet.rows;
    viewport.top = this.getters.getRowIndex(viewport.offsetY + HEADER_HEIGHT, 0, sheet);
    const y = this.offsetHeight + viewport.offsetY;
    viewport.bottom = rows.length - 1;
    for (let i = viewport.top; i < rows.length; i++) {
      if (y < rows[i].end) {
        viewport.bottom = i;
        break;
      }
    }
  }

  /**
   * This function will make sure that the provided cell position (or current selected position) is part of
   * the viewport that is actually displayed on the client, that is, the snapped one. We therefore adjust
   * the offset of the snapped viewport until it contains the cell completely.
   * In order to keep the coherence of both viewports, it is also necessary to update the standard viewport
   * if the zones of both viewports don't match.
   */
  private adjustViewportsPosition(sheetId: UID, position?: [number, number]) {
    const sheet = this.getters.getSheet(sheetId);
    const { cols, rows } = sheet;
    const adjustedViewport = this.getViewport(sheetId);
    const { width: offsetWidth, height: offsetHeight } = this.getViewportDimension();
    position = position || this.getters.getSheetPosition(sheetId);
    const [col, row] = getNextVisibleCellCoords(
      sheet,
      ...this.getters.getMainCell(sheetId, position[0], position[1])
    );
    while (
      cols[col].end > adjustedViewport.offsetX + offsetWidth &&
      adjustedViewport.offsetX < cols[col].start
    ) {
      adjustedViewport.offsetX = cols[adjustedViewport.left].end;
      this.adjustViewportZoneX(sheetId, adjustedViewport);
    }
    while (cols[col].start < adjustedViewport.offsetX) {
      const step = cols
        .slice(0, adjustedViewport.left)
        .reverse()
        .findIndex((col) => !col.isHidden);
      adjustedViewport.offsetX = cols[adjustedViewport.left - 1 - step].start;
      this.adjustViewportZoneX(sheetId, adjustedViewport);
    }
    while (
      rows[row].end > adjustedViewport.offsetY + offsetHeight &&
      adjustedViewport.offsetY < rows[row].start
    ) {
      adjustedViewport.offsetY = rows[adjustedViewport.top].end;
      this.adjustViewportZoneY(sheetId, adjustedViewport);
    }
    while (rows[row].start < adjustedViewport.offsetY) {
      const step = rows
        .slice(0, adjustedViewport.top)
        .reverse()
        .findIndex((row) => !row.isHidden);
      adjustedViewport.offsetY = rows[adjustedViewport.top - 1 - step].start;
      this.adjustViewportZoneY(sheetId, adjustedViewport);
    }
  }
}
