import { PositionMap } from "../../helpers/cells/position_map";
import {
  deepCopy,
  deepEquals,
  getItemId,
  intersection,
  positionToZone,
  recomputeZones,
  removeFalsyAttributes,
  toZone,
} from "../../helpers/index";
import { adjacent, overlap, splitIfAdjacent, zoneToXc } from "../../helpers/zones";
import {
  ApplyRangeChange,
  Border,
  BorderData,
  BorderDescr,
  CellPosition,
  Color,
  CommandResult,
  CoreCommand,
  ExcelWorkbookData,
  HeaderIndex,
  SetBorderCommand,
  SetZoneBordersCommand,
  UID,
  UnboundedZone,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

export type ZoneBorderData = {
  top?: BorderDescr;
  bottom?: BorderDescr;
  left?: BorderDescr;
  right?: BorderDescr;
  vertical?: BorderDescr;
  horizontal?: BorderDescr;
};

export type ZoneBorder = {
  zone: UnboundedZone;
  style: ZoneBorderData;
};

interface BordersPluginState {
  readonly borders: Record<UID, ZoneBorder[] | undefined>;
}

export class BordersPlugin extends CorePlugin<BordersPluginState> implements BordersPluginState {
  static getters = [
    "getCellBorder",
    "getBorders",
    "getBordersColors",
    "getCellBordersInZone",
  ] as const;

  public readonly borders: BordersPluginState["borders"] = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_BORDER":
        return this.checkValidations(cmd, this.checkBordersUnchanged, this.ensureHasBorder);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.addBordersToMerge(cmd.sheetId, zone);
        }
        break;
      case "DUPLICATE_SHEET":
        this.history.update("borders", cmd.sheetIdTo, deepCopy(this.borders[cmd.sheetId]));
        break;
      case "DELETE_SHEET":
        const allBorders = { ...this.borders };
        delete allBorders[cmd.sheetId];
        this.history.update("borders", allBorders);
        break;
      case "SET_BORDER":
        if (cmd.border) this.addBorders(cmd.sheetId, [positionToZone(cmd)], cmd.border);
        break;
      case "SET_BORDERS_ON_TARGET":
        for (const zone of cmd.target) {
          for (let col = zone.left; col <= zone.right; col++) {
            for (let row = zone.top; row <= zone.bottom; row++) {
              this.addBorder(
                cmd.sheetId,
                { left: col, right: col, top: row, bottom: row },
                cmd.border && Object.keys(cmd.border).length ? cmd.border : undefined
              );
            }
          }
        }
        break;
      case "SET_ZONE_BORDERS":
        const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
        if (cmd.border.position === "clear") {
          this.clearBorders(cmd.sheetId, target);
        } else {
          this.addBorders(cmd.sheetId, target, this.borderDataToNewBorderData(cmd.border));
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearBorders(cmd.sheetId, cmd.target);
        break;
    }
  }

  beforeHandle(cmd: CoreCommand): void {
    if (cmd.type === "REMOVE_COLUMNS_ROWS") {
      if (cmd.dimension === "ROW") {
        this.onRowRemove(cmd.sheetId, cmd.elements);
      } else {
        this.onColRemove(cmd.sheetId, cmd.elements);
      }
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId: UID) {
    const newBorders: ZoneBorder[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      const change = applyChange(this.getters.getRangeFromZone(sheetId, border.zone));
      switch (change.changeType) {
        case "RESIZE":
        case "CHANGE":
        case "MOVE":
          newBorders.push({ ...border, zone: change.range.unboundedZone });
          break;
        case "NONE":
          newBorders.push(border);
          break;
      }
    }
    this.history.update(
      "borders",
      sheetId,
      newBorders.filter((border) => !this.borderIsClear(border))
    );
  }

  private onRowRemove(sheetId: UID, rowsIndex: HeaderIndex[]) {
    const rows = new Set(rowsIndex);
    const newBorders: ZoneBorder[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      let newBorder = border;
      if (rows.has(border.zone.top)) {
        newBorder = deepCopy(border);
        newBorder.style.top = border.style.horizontal;
      }
      if (border.zone.bottom !== undefined && rows.has(border.zone.bottom)) {
        newBorder = newBorder === border ? deepCopy(border) : newBorder;
        newBorder.style.bottom = border.style.horizontal;
      }
      newBorders.push(newBorder);
    }
    this.history.update("borders", sheetId, newBorders);
  }

  private onColRemove(sheetId: UID, colsIndex: HeaderIndex[]) {
    const cols = new Set(colsIndex);
    const newBorders: ZoneBorder[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      let newBorder = border;
      if (cols.has(border.zone.left)) {
        newBorder = deepCopy(border);
        newBorder.style.left = border.style.vertical;
      }
      if (border.zone.right !== undefined && cols.has(border.zone.right)) {
        newBorder = newBorder === border ? deepCopy(border) : newBorder;
        newBorder.style.right = border.style.vertical;
      }
      newBorders.push(newBorder);
    }
    this.history.update(
      "borders",
      sheetId,
      newBorders.filter((border) => !this.borderIsClear(border))
    );
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellBorder(position: CellPosition): Border {
    return this.getZoneExternalBorders(position.sheetId, positionToZone(position));
  }

  private getZoneExternalBorders(sheetId: UID, zone: Zone): ZoneBorderData {
    const externalBorders: ZoneBorderData = {};
    for (const border of this.borders[sheetId] ?? []) {
      if (overlap(border.zone, zone)) {
        externalBorders.right =
          (zone.right === border.zone.right ? border.style.right : border.style.vertical) ??
          externalBorders.right;
        externalBorders.left =
          (zone.left === border.zone.left ? border.style.left : border.style.vertical) ??
          externalBorders.left;
        externalBorders.bottom =
          (zone.bottom === border.zone.bottom ? border.style.bottom : border.style.horizontal) ??
          externalBorders.bottom;
        externalBorders.top =
          (zone.top === border.zone.top ? border.style.top : border.style.horizontal) ??
          externalBorders.top;
      }
    }
    return externalBorders;
  }

  getCellBordersInZone(sheetId: UID, zone: Zone): PositionMap<Border> {
    const borders = new PositionMap<Border>();
    for (const border of this.borders[sheetId] ?? []) {
      const { zone: bzone, style: bstyle } = border;
      const inter = intersection(bzone, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          const cell = borders.get({ sheetId, col, row }) ?? {};
          cell.right = (col === bzone.right ? bstyle.right : bstyle.vertical) ?? cell.right;
          cell.left = (col === bzone.left ? bstyle.left : bstyle.vertical) ?? cell.left;
          cell.bottom = (row === bzone.bottom ? bstyle.bottom : bstyle.horizontal) ?? cell.bottom;
          cell.top = (row === bzone.top ? bstyle.top : bstyle.horizontal) ?? cell.top;
          borders.set({ sheetId, col, row }, cell);
        }
      }
    }
    return borders;
  }

  getBordersColors(sheetId: UID): Color[] {
    const colors: Set<Color> = new Set<Color>();
    for (const border of this.borders[sheetId] ?? []) {
      for (const style of Object.values(border.style)) {
        if (style?.color) colors.add(style.color);
      }
    }
    return [...colors];
  }

  getBorders(sheetId: UID, zone: Zone): ZoneBorder[] {
    const borders: ZoneBorder[] = [];
    for (const existingBorder of this.borders[sheetId] ?? []) {
      const inter = intersection(existingBorder.zone, zone);
      if (!inter) {
        continue;
      }
      borders.push(this.computeBorderFromZone(inter, existingBorder));
    }
    return borders;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private computeBorderFromZone(newZone: UnboundedZone, border: ZoneBorder): ZoneBorder {
    const oldPosition = border.style;
    const oldZone = border.zone;
    const equalSide = {
      top: newZone.top === oldZone.top,
      bottom: newZone.bottom === oldZone.bottom,
      left: newZone.left === oldZone.left,
      right: newZone.right === oldZone.right,
    };
    return {
      zone: newZone,
      style: {
        top: equalSide.top ? oldPosition.top : oldPosition.horizontal,
        bottom: equalSide.bottom ? oldPosition.bottom : oldPosition.horizontal,
        left: equalSide.left ? oldPosition.left : oldPosition.vertical,
        right: equalSide.right ? oldPosition.right : oldPosition.vertical,
        vertical: oldPosition.vertical,
        horizontal: oldPosition.horizontal,
      },
    };
  }

  private borderIsClear(border: ZoneBorder) {
    const style = border.style;
    if (style.left || style.right || style.bottom || style.top) return false;
    const zone = border.zone;
    if ((zone.bottom === undefined || zone.top < zone.bottom) && style.horizontal) return false;
    if ((zone.right === undefined || zone.left < zone.right) && style.vertical) return false;
    return true;
  }

  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (const zone of zones) {
      this.removeAndClearAdjacent(sheetId, zone);
    }
  }

  private removeAndClearAdjacent(sheetId: UID, zone: Zone) {
    const borders: ZoneBorder[] = [];
    for (const existingBorder of this.borders[sheetId] ?? []) {
      for (const updatedBorderZone of recomputeZones([existingBorder.zone], [zone])) {
        for (const newZone of splitIfAdjacent(updatedBorderZone, zone)) {
          const border = this.computeBorderFromZone(newZone, existingBorder);
          const adjacentEdge = adjacent(newZone, zone);
          switch (adjacentEdge?.position) {
            case "left":
              border.style.left = undefined;
              break;
            case "right":
              border.style.right = undefined;
              break;
            case "top":
              border.style.top = undefined;
              break;
            case "bottom":
              border.style.bottom = undefined;
              break;
          }
          borders.push(border);
        }
      }
    }
    this.history.update("borders", sheetId, borders);
  }

  private addBorders(sheetId: UID, zones: Zone[], border: ZoneBorderData) {
    for (const zone of zones) {
      this.addBorder(sheetId, zone, border);
    }
  }

  private addBorder(
    sheetId: UID,
    zone: Zone,
    newBorder: ZoneBorderData | undefined,
    force = false
  ) {
    const borders: ZoneBorder[] = [];
    const plannedBorder = newBorder ? { zone, style: newBorder } : undefined;
    const sideToClear = {
      left: force || !!newBorder?.left,
      right: force || !!newBorder?.right,
      top: force || !!newBorder?.top,
      bottom: force || !!newBorder?.bottom,
    };
    let editingZone: Zone[] = [zone];
    for (const existingBorder of this.borders[sheetId] ?? []) {
      const inter = intersection(existingBorder.zone, zone);
      if (!inter) {
        // Clear adjacent borders on which you write
        const adjacentEdge = adjacent(existingBorder.zone, zone);
        if (adjacentEdge && sideToClear[adjacentEdge.position]) {
          for (const newZone of splitIfAdjacent(existingBorder.zone, zone)) {
            const border = this.computeBorderFromZone(newZone, existingBorder);
            const adjacentEdge = adjacent(newZone, zone);
            switch (adjacentEdge?.position) {
              case "left":
                border.style.left = undefined;
                break;
              case "right":
                border.style.right = undefined;
                break;
              case "top":
                border.style.top = undefined;
                break;
              case "bottom":
                border.style.bottom = undefined;
                break;
            }
            borders.push(border);
          }
        } else {
          borders.push(existingBorder);
        }
        continue;
      }

      if (plannedBorder) {
        let border = this.computeBorderFromZone(inter, plannedBorder).style;
        if (!force) {
          border = {
            ...this.computeBorderFromZone(inter, existingBorder).style,
            ...removeFalsyAttributes(border),
          };
        }
        borders.push({ zone: inter, style: border });
      }
      editingZone = recomputeZones(editingZone, [inter]);
      for (const updatedBorderZone of recomputeZones([existingBorder.zone], [inter])) {
        borders.push(this.computeBorderFromZone(updatedBorderZone, existingBorder));
      }
    }
    if (plannedBorder) {
      borders.push(...editingZone.map((zone) => this.computeBorderFromZone(zone, plannedBorder)));
    }
    this.history.update(
      "borders",
      sheetId,
      borders.filter((border) => !this.borderIsClear(border))
    );
  }

  private borderDataToNewBorderData(border: BorderData): ZoneBorderData {
    const borderPosition: ZoneBorderData = {};
    const borderStyle = { color: border.color ?? "#000000", style: border.style ?? "thin" };
    if (["all", "external", "top"].includes(border.position)) {
      borderPosition.top = { ...borderStyle };
    }
    if (["all", "external", "bottom"].includes(border.position)) {
      borderPosition.bottom = { ...borderStyle };
    }
    if (["all", "external", "left"].includes(border.position)) {
      borderPosition.left = { ...borderStyle };
    }
    if (["all", "external", "right"].includes(border.position)) {
      borderPosition.right = { ...borderStyle };
    }
    if (["all", "hv", "v"].includes(border.position)) {
      borderPosition.vertical = { ...borderStyle };
    }
    if (["all", "hv", "h"].includes(border.position)) {
      borderPosition.horizontal = { ...borderStyle };
    }
    return borderPosition;
  }

  private checkBordersUnchanged(cmd: SetBorderCommand) {
    const currentBorder = this.getCellBorder(cmd);
    const areAllNewBordersUndefined =
      !cmd.border?.bottom && !cmd.border?.left && !cmd.border?.right && !cmd.border?.top;
    if ((!currentBorder && areAllNewBordersUndefined) || deepEquals(currentBorder, cmd.border)) {
      return CommandResult.NoChanges;
    }
    return CommandResult.Success;
  }

  private ensureHasBorder(cmd: SetBorderCommand | SetZoneBordersCommand) {
    if (!cmd.border) return CommandResult.NoChanges;
    return CommandResult.Success;
  }

  /**
   * Compute the borders to add to the given zone merged.
   */
  private addBordersToMerge(sheetId: UID, zone: Zone) {
    const border = {
      ...this.getZoneExternalBorders(sheetId, zone),
      ...removeFalsyAttributes(this.getCellBorder({ sheetId, col: zone.left, row: zone.top })),
    };
    this.addBorder(sheetId, zone, border, true);
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  import(data: WorkbookData) {
    if (Object.keys(data.borders || {}).length) {
      for (const sheet of data.sheets) {
        const borderType: Record<UID, Zone[]> = {};
        for (const zoneXc in sheet.borders) {
          const borderId = sheet.borders[zoneXc];
          if (!borderId) continue;
          if (!(borderId in borderType)) borderType[borderId] = [];
          borderType[borderId].push(toZone(zoneXc));
        }
        for (const borderId in borderType) {
          const zones = recomputeZones(borderType[borderId]);
          const border = data.borders[borderId];
          this.addBorders(sheet.id, zones, border);
        }
      }
    }
    // Merges
    for (const sheetData of data.sheets) {
      if (sheetData.merges) {
        for (const merge of sheetData.merges) {
          this.addBordersToMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    const borders: { [borderId: number]: ZoneBorderData } = {};
    for (const sheet of data.sheets) {
      sheet.borders = {};
      for (const border of this.borders[sheet.id] ?? []) {
        sheet.borders[zoneToXc(border.zone)] = getItemId(border.style, borders);
      }
    }
    data.borders = borders;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
