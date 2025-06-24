import { PositionMap } from "../../helpers/cells/position_map";
import {
  createRange,
  deepCopy,
  getItemId,
  intersection,
  iterateItemIdsPositions,
  positionToZone,
  recomputeZones,
  removeFalsyAttributes,
  toZone,
} from "../../helpers/index";
import { adjacent, overlap, zoneToXc } from "../../helpers/zones";
import { NewBorder, NewBorderData } from "../../types/border";
import {
  ApplyRangeChange,
  Border,
  BorderData,
  CellPosition,
  Color,
  CoreCommand,
  ExcelWorkbookData,
  HeaderIndex,
  UID,
  UnboundedZone,
  WorkbookData,
  Zone,
} from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface BordersPluginState {
  readonly borders: Record<UID, NewBorder[] | undefined>;
}
/**
 * Formatting plugin.
 *
 * This plugin manages all things related to a cell look:
 * - borders
 */
export class BordersPlugin extends CorePlugin<BordersPluginState> implements BordersPluginState {
  static getters = [
    "getCellBorder",
    "getBordersColors",
    "getBorders",
    "getZoneCellBorders",
  ] as const;

  public readonly borders: BordersPluginState["borders"] = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

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
        if (!cmd.border) break;
        this.addBorders(cmd.sheetId, [positionToZone(cmd)], cmd.border);
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
        if (cmd.border) {
          const target = cmd.target.map((zone) => this.getters.expandZone(cmd.sheetId, zone));
          if (cmd.border.position === "clear") {
            this.clearBorders(cmd.sheetId, target);
          } else {
            this.addBorders(cmd.sheetId, target, this.borderDataToNewBorderData(cmd.border));
          }
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearBorders(cmd.sheetId, cmd.target);
        break;
    }
  }

  beforeHandle(cmd: CoreCommand): void {
    if (cmd.type === "REMOVE_COLUMNS_ROWS") {
      if (cmd.dimension === "ROW") this.onRowRemove(cmd.sheetId, cmd.elements);
      else this.onColRemove(cmd.sheetId, cmd.elements);
    }
  }

  adaptRanges(applyChange: ApplyRangeChange, sheetId?: UID, sheetName?: string) {
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.borders);
    for (const sheetId of sheetIds) {
      this.adaptBorderRange(applyChange, sheetId);
    }
  }

  private adaptBorderRange(applyChange: ApplyRangeChange, sheetId: UID) {
    const newBorders: NewBorder[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      const change = applyChange(
        createRange(
          { zone: border.zone, sheetId, parts: [], prefixSheet: false },
          this.getters.getSheetSize
        )
      );
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
    const newBorders: NewBorder[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      let newBorder = border;
      if (rows.has(border.zone.top)) {
        newBorder = deepCopy(border);
        newBorder.border.top = border.border.horizontal;
      }
      if (border.zone.bottom !== undefined && rows.has(border.zone.bottom)) {
        newBorder = newBorder === border ? deepCopy(border) : newBorder;
        newBorder.border.bottom = border.border.horizontal;
      }
      newBorders.push(newBorder);
    }
    this.history.update(
      "borders",
      sheetId,
      newBorders.filter((border) => !this.borderIsClear(border))
    );
  }

  private onColRemove(sheetId: UID, colsIndex: HeaderIndex[]) {
    const cols = new Set(colsIndex);
    const newBorders: NewBorder[] = [];
    for (const border of this.borders[sheetId] ?? []) {
      let newBorder = border;
      if (cols.has(border.zone.left)) {
        newBorder = deepCopy(border);
        newBorder.border.left = border.border.vertical;
      }
      if (border.zone.right !== undefined && cols.has(border.zone.right)) {
        newBorder = newBorder === border ? deepCopy(border) : newBorder;
        newBorder.border.right = border.border.vertical;
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

  private getZoneExternalBorders(sheetId: UID, zone: Zone) {
    const externalBorders = {};
    for (const border of this.borders[sheetId] ?? []) {
      if (overlap(zone, border.zone)) {
        externalBorders["right"] =
          (zone.right === border.zone.right ? border.border.right : border.border.vertical) ??
          externalBorders["right"];
        externalBorders["left"] =
          (zone.left === border.zone.left ? border.border.left : border.border.vertical) ??
          externalBorders["left"];
        externalBorders["bottom"] =
          (zone.bottom === border.zone.bottom ? border.border.bottom : border.border.horizontal) ??
          externalBorders["bottom"];
        externalBorders["top"] =
          (zone.top === border.zone.top ? border.border.top : border.border.horizontal) ??
          externalBorders["top"];
      }
    }
    return externalBorders;
  }

  getZoneCellBorders(sheetId: UID, zone: Zone): PositionMap<Border> {
    const borders = new PositionMap<Border>();
    for (const border of this.borders[sheetId] ?? []) {
      const { zone: bzone, border: bborder } = border;
      const inter = intersection(bzone, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          const cell = borders.get({ sheetId, col, row }) ?? {};
          cell["right"] = (col === bzone.right ? bborder.right : bborder.vertical) ?? cell["right"];
          cell["left"] = (col === bzone.left ? bborder.left : bborder.vertical) ?? cell["left"];
          cell["bottom"] =
            (row === bzone.bottom ? bborder.bottom : bborder.horizontal) ?? cell["bottom"];
          cell["top"] = (row === bzone.top ? bborder.top : bborder.horizontal) ?? cell["top"];
          borders.set({ sheetId, col, row }, cell);
        }
      }
    }
    return borders;
  }

  getBordersColors(sheetId: UID): Color[] {
    const colors: Set<Color> = new Set<Color>();
    for (const border of this.borders[sheetId] ?? []) {
      for (const style of Object.values(border.border)) {
        if (style?.color) colors.add(style.color);
      }
    }
    return [...colors];
  }

  getBorders(sheetId: UID): NewBorder[] {
    return this.borders[sheetId] ?? [];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getNewBorderFromZoneClear(newZone: UnboundedZone, oldBorder: NewBorder): NewBorder {
    const oldPosition = oldBorder.border;
    const oldZone = oldBorder.zone;
    const equalSide = {
      top: newZone.top === oldZone.top,
      bottom: newZone.bottom === oldZone.bottom,
      left: newZone.left === oldZone.left,
      right: newZone.right === oldZone.right,
    };
    return {
      zone: newZone,
      border: {
        top: equalSide.top ? oldPosition.top : undefined,
        bottom: equalSide.bottom ? oldPosition.bottom : undefined,
        left: equalSide.left
          ? oldPosition.left
          : equalSide.bottom && equalSide.top
          ? undefined
          : oldPosition.vertical,
        right: equalSide.right
          ? oldPosition.right
          : equalSide.bottom && equalSide.top
          ? undefined
          : oldPosition.vertical,
        vertical: oldPosition.vertical,
        horizontal: oldPosition.horizontal,
      },
    };
  }

  private getNewBorderFromZone(newZone: UnboundedZone, oldBorder: NewBorder): NewBorder {
    const oldPosition = oldBorder.border;
    const oldZone = oldBorder.zone;
    const equalSide = {
      top: newZone.top === oldZone.top,
      bottom: newZone.bottom === oldZone.bottom,
      left: newZone.left === oldZone.left,
      right: newZone.right === oldZone.right,
    };
    return {
      zone: newZone,
      border: removeFalsyAttributes({
        top: equalSide.top ? oldPosition.top : oldPosition.horizontal,
        bottom: equalSide.bottom ? oldPosition.bottom : oldPosition.horizontal,
        left: equalSide.left ? oldPosition.left : oldPosition.vertical,
        right: equalSide.right ? oldPosition.right : oldPosition.vertical,
        vertical: oldPosition.vertical,
        horizontal: oldPosition.horizontal,
      }),
    };
  }

  private borderIsClear(border: NewBorder) {
    const pos = border.border;
    if (pos.left || pos.right || pos.bottom || pos.top) return false;
    const zone = border.zone;
    if ((zone.bottom === undefined || zone.top + 1 < zone.bottom) && pos.horizontal) return false;
    if ((zone.right === undefined || zone.left + 1 < zone.right) && pos.vertical) return false;
    return true;
  }

  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (const zone of zones) {
      this.addBorder(sheetId, zone, undefined);
      this.clearAdjacent(sheetId, zone);
    }
  }

  private clearAdjacent(sheetId: UID, zone: Zone) {
    const borders: NewBorder[] = [];
    for (const existingBorder of this.borders[sheetId] ?? []) {
      const adjacence = adjacent(existingBorder.zone, zone);
      if (!adjacence) {
        borders.push(existingBorder);
        continue;
      }
      let adjacentBorder: NewBorder;
      switch (adjacence.position) {
        case "left":
        case "right":
          adjacentBorder = this.getNewBorderFromZone(
            {
              top: adjacence.start,
              bottom: adjacence.stop,
              left: existingBorder.zone.left,
              right: existingBorder.zone.right,
            },
            existingBorder
          );
          if (adjacence.position === "left") {
            adjacentBorder.border.left = undefined;
          } else {
            adjacentBorder.border.right = undefined;
          }
          break;
        case "top":
        case "bottom":
          adjacentBorder = this.getNewBorderFromZone(
            {
              top: existingBorder.zone.top,
              bottom: existingBorder.zone.bottom,
              left: adjacence.start,
              right: adjacence.stop,
            },
            existingBorder
          );
          if (adjacence.position === "top") {
            adjacentBorder.border.top = undefined;
          } else {
            adjacentBorder.border.bottom = undefined;
          }
      }
      borders.push(adjacentBorder);
      for (const updatedBorderZone of recomputeZones(
        [existingBorder.zone],
        [adjacentBorder.zone]
      )) {
        borders.push(this.getNewBorderFromZoneClear(updatedBorderZone, existingBorder));
      }
    }
    this.history.update("borders", sheetId, borders);
  }

  private addBorders(sheetId: UID, zones: Zone[], border: NewBorderData) {
    for (const zone of zones) {
      this.addBorder(sheetId, this.minimalZone(zone, border), border);
    }
  }

  private addBorder(sheetId: UID, zone: Zone, newBorder: NewBorderData | undefined, force = false) {
    const borders: NewBorder[] = [];
    const plannedBorder = newBorder ? { zone, border: newBorder } : undefined;
    let editingZone: Zone[] = [zone];
    for (const existingBorder of this.borders[sheetId] ?? []) {
      const inter = intersection(existingBorder.zone, zone);
      if (!inter) {
        borders.push(existingBorder);
        continue;
      }
      if (plannedBorder) {
        let border = this.getNewBorderFromZone(inter, plannedBorder).border;
        if (!force) {
          border = { ...this.getNewBorderFromZone(inter, existingBorder).border, ...border };
        }
        borders.push({ zone: inter, border });
      }
      editingZone = recomputeZones(editingZone, [inter]);
      for (const updatedBorderZone of recomputeZones([existingBorder.zone], [inter])) {
        borders.push(this.getNewBorderFromZone(updatedBorderZone, existingBorder));
      }
    }
    if (plannedBorder) {
      borders.push(...editingZone.map((zone) => this.getNewBorderFromZone(zone, plannedBorder)));
    }
    this.history.update(
      "borders",
      sheetId,
      borders.filter((border) => !this.borderIsClear(border))
    );
  }

  private borderDataToNewBorderData(border: BorderData): NewBorderData {
    const borderPosition = {};
    const borderStyle = { color: border.color ?? "#000000", style: border.style ?? "thin" };
    if (["all", "external", "top"].includes(border.position)) {
      borderPosition["top"] = { ...borderStyle };
    }
    if (["all", "external", "bottom"].includes(border.position)) {
      borderPosition["bottom"] = { ...borderStyle };
    }
    if (["all", "external", "left"].includes(border.position)) {
      borderPosition["left"] = { ...borderStyle };
    }
    if (["all", "external", "right"].includes(border.position)) {
      borderPosition["right"] = { ...borderStyle };
    }
    if (["all", "hv", "v"].includes(border.position)) {
      borderPosition["vertical"] = { ...borderStyle };
    }
    if (["all", "hv", "h"].includes(border.position)) {
      borderPosition["horizontal"] = { ...borderStyle };
    }
    return borderPosition;
  }

  private minimalZone(zone: Zone, border: NewBorderData): Zone {
    if (border.horizontal || border.vertical) {
      return zone;
    }

    if (!border.left && !border.right) {
      if (!border.bottom) {
        zone.bottom = zone.top;
      } else if (!border.top) {
        zone.top = zone.bottom;
      }
    } else if (!border.top && !border.bottom) {
      if (!border.right) {
        zone.right = zone.left;
      } else if (!border.left) {
        zone.left = zone.right;
      }
    }
    return zone;
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
        for (const [position, borderId] of iterateItemIdsPositions(sheet.id, sheet.borders)) {
          const { sheetId } = position;
          const border = data.borders[borderId];
          this.addBorder(sheetId, positionToZone(position), border);
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
    const borders: { [borderId: number]: NewBorderData } = {};
    for (const sheet of data.sheets) {
      sheet.borders = {};
      for (const border of this.borders[sheet.id] ?? []) {
        sheet.borders[zoneToXc(border.zone)] = getItemId(border.border, borders);
      }
    }
    data.borders = borders;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
