import { PositionMap } from "../../helpers/cells/position_map";
import {
  createRange,
  deepCopy,
  deepEquals,
  getItemId,
  intersection,
  iterateItemIdsPositions,
  positionToZone,
  recomputeZones,
  removeFalsyAttributes,
  toZone,
} from "../../helpers/index";
import { adjacent, isInside, overlap, splitIfAdjacent, zoneToXc } from "../../helpers/zones";
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
  Style,
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

export type StyleZone = StyleAndBorder & {
  zone: UnboundedZone;
};

export type StyleAndBorder = {
  border?: ZoneBorderData;
  style?: Style;
};

interface BordersPluginState {
  readonly styleAndBorder: Record<UID, StyleZone[] | undefined>;
}

export class BordersPlugin extends CorePlugin<BordersPluginState> implements BordersPluginState {
  static getters = [
    "getCellBorder",
    "getCellStyle",
    "getStyleColors",
    "getCellBordersInZone",
    "getCellStyleInZone",
    "getCellStyleAndBorderInZone",
    "getZoneExternalBorders",
  ] as const;

  public readonly styleAndBorder: BordersPluginState["styleAndBorder"] = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "SET_BORDER":
        return this.checkValidations(
          cmd,
          this.chainValidations(this.checkBordersUnchanged, this.ensureHasBorder)
        );
      case "SET_ZONE_BORDERS":
        return this.ensureHasBorder(cmd);
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_CELL":
        if ("style" in cmd && cmd.style) {
          this.setStyle(cmd.sheetId, positionToZone(cmd), cmd.style);
        }
        break;
      case "SET_FORMATTING":
        if (
          ("style" in cmd && cmd.style !== undefined) ||
          ("border" in cmd && cmd.border !== undefined)
        ) {
          this.setStyleOnZones(
            cmd.sheetId,
            cmd.target,
            cmd.style,
            cmd.border,
            cmd.force ? { forceStyle: true, forceBorder: true } : {}
          );
        }
        break;
      case "ADD_MERGE":
        for (const zone of cmd.target) {
          this.onMerge(cmd.sheetId, zone);
        }
        break;
      case "DUPLICATE_SHEET":
        this.history.update(
          "styleAndBorder",
          cmd.sheetIdTo,
          deepCopy(this.styleAndBorder[cmd.sheetId])
        );
        break;
      case "DELETE_SHEET":
        const allBorders = { ...this.styleAndBorder };
        delete allBorders[cmd.sheetId];
        this.history.update("styleAndBorder", allBorders);
        break;
      case "SET_BORDER":
        this.setBordersOnZones(cmd.sheetId, [positionToZone(cmd)], cmd.border!);
        break;
      case "SET_BORDERS_ON_TARGET":
        for (const zone of cmd.target) {
          for (let col = zone.left; col <= zone.right; col++) {
            for (let row = zone.top; row <= zone.bottom; row++) {
              this.setStyle(
                cmd.sheetId,
                { left: col, right: col, top: row, bottom: row },
                undefined,
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
          this.setBordersOnZones(cmd.sheetId, target, this.borderDataToNewBorderData(cmd.border));
        }
        break;
      case "CLEAR_FORMATTING":
        this.clearBorders(cmd.sheetId, cmd.target);
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "CLEAR_CELLS":
        this.clearStyle(cmd.sheetId, cmd.target);
        break;
      case "CLEAR_CELL":
        this.clearStyle(cmd.sheetId, [positionToZone(cmd)]);
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
    const sheetIds = sheetId ? [sheetId] : Object.keys(this.styleAndBorder);
    for (const sheetId of sheetIds) {
      this.adaptBorderRange(applyChange, sheetId);
    }
  }

  private adaptBorderRange(applyChange: ApplyRangeChange, sheetId: UID) {
    const newBorders: StyleZone[] = [];
    for (const border of this.styleAndBorder[sheetId] ?? []) {
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
      "styleAndBorder",
      sheetId,
      newBorders.filter((border) => !this.styleZoneIsClear(border))
    );
  }

  private onRowRemove(sheetId: UID, rowsIndex: HeaderIndex[]) {
    const rows = new Set(rowsIndex);
    const newBorders: StyleZone[] = [];
    for (const border of this.styleAndBorder[sheetId] ?? []) {
      if (!border.border) continue;
      let newBorder = border;
      if (rows.has(border.zone.top)) {
        newBorder = deepCopy(border);
        newBorder.border!.top = border.border.horizontal;
      }
      if (border.zone.bottom !== undefined && rows.has(border.zone.bottom)) {
        newBorder = newBorder === border ? deepCopy(border) : newBorder;
        newBorder.border!.bottom = border.border.horizontal;
      }
      newBorders.push(newBorder);
    }
    this.history.update(
      "styleAndBorder",
      sheetId,
      newBorders.filter((border) => !this.styleZoneIsClear(border))
    );
  }

  private onColRemove(sheetId: UID, colsIndex: HeaderIndex[]) {
    const cols = new Set(colsIndex);
    const newBorders: StyleZone[] = [];
    for (const border of this.styleAndBorder[sheetId] ?? []) {
      if (!border.border) continue;
      let newBorder = border;
      if (cols.has(border.zone.left)) {
        newBorder = deepCopy(border);
        newBorder.border!.left = border.border.vertical;
      }
      if (border.zone.right !== undefined && cols.has(border.zone.right)) {
        newBorder = newBorder === border ? deepCopy(border) : newBorder;
        newBorder.border!.right = border.border.vertical;
      }
      newBorders.push(newBorder);
    }
    this.history.update(
      "styleAndBorder",
      sheetId,
      newBorders.filter((border) => !this.styleZoneIsClear(border))
    );
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCellBorder(position: CellPosition): Border {
    return this.getZoneExternalBorders(position.sheetId, positionToZone(position));
  }

  getCellStyle({ col, row, sheetId }: CellPosition): Style {
    for (const styleZone of this.styleAndBorder[sheetId] ?? []) {
      if (isInside(col, row, styleZone.zone)) return styleZone.style || {};
    }
    return {};
  }

  // This is available as a getter for testing purposes
  getZoneExternalBorders(sheetId: UID, zone: Zone): Border {
    const externalBorders = {};
    for (const border of this.styleAndBorder[sheetId] ?? []) {
      if (overlap(border.zone, zone)) {
        externalBorders["right"] =
          (zone.right === border.zone.right ? border.border?.right : border.border?.vertical) ??
          externalBorders["right"];
        externalBorders["left"] =
          (zone.left === border.zone.left ? border.border?.left : border.border?.vertical) ??
          externalBorders["left"];
        externalBorders["bottom"] =
          (zone.bottom === border.zone.bottom
            ? border.border?.bottom
            : border.border?.horizontal) ?? externalBorders["bottom"];
        externalBorders["top"] =
          (zone.top === border.zone.top ? border.border?.top : border.border?.horizontal) ??
          externalBorders["top"];
      }
    }
    return externalBorders;
  }

  getCellBordersInZone(sheetId: UID, zone: Zone): PositionMap<Border> {
    const borders = new PositionMap<Border>();
    for (const border of this.styleAndBorder[sheetId] ?? []) {
      const { zone: bzone, border: bborder } = border;
      if (!bborder) continue;
      const inter = intersection(bzone, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          const cell = {};
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

  getCellStyleInZone(sheetId: UID, zone: Zone): PositionMap<Style> {
    const styles = new PositionMap<Style>();
    for (const styleZone of this.styleAndBorder[sheetId] ?? []) {
      const { zone: szone, style } = styleZone;
      if (!style) continue;
      const inter = intersection(szone, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          styles.set({ sheetId, col, row }, style);
        }
      }
    }
    return styles;
  }

  getCellStyleAndBorderInZone(sheetId: UID, zone: Zone): PositionMap<StyleAndBorder> {
    const styles = new PositionMap<StyleAndBorder>();
    for (const styleZone of this.styleAndBorder[sheetId] ?? []) {
      const inter = intersection(styleZone.zone, zone);
      if (!inter) continue;
      for (let col = inter.left; col <= inter.right; col++) {
        for (let row = inter.top; row <= inter.bottom; row++) {
          styles.set(
            { sheetId, col, row },
            this.getNewStyleZoneFromZone(
              { left: col, right: col, top: row, bottom: row },
              styleZone
            )
          );
        }
      }
    }
    return styles;
  }

  getStyleColors(sheetId: UID): Color[] {
    const colors: Set<Color> = new Set<Color>();
    for (const { style, border } of this.styleAndBorder[sheetId] ?? []) {
      if (style?.fillColor) colors.add(style.fillColor);
      if (style?.textColor) colors.add(style.textColor);
      for (const borderStyle of Object.values(border || {})) {
        if (borderStyle?.color) colors.add(borderStyle.color);
      }
    }
    return [...colors];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private getNewStyleZoneFromZone(newZone: UnboundedZone, oldBorder: StyleZone): StyleZone {
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
      style: oldBorder.style,
      border:
        oldPosition &&
        removeFalsyAttributes({
          top: equalSide.top ? oldPosition.top : oldPosition.horizontal,
          bottom: equalSide.bottom ? oldPosition.bottom : oldPosition.horizontal,
          left: equalSide.left ? oldPosition.left : oldPosition.vertical,
          right: equalSide.right ? oldPosition.right : oldPosition.vertical,
          vertical: oldPosition.vertical,
          horizontal: oldPosition.horizontal,
        }),
    };
  }

  private styleIsDefault(styleZone: StyleZone) {
    if (!styleZone.style) return true;
    const {
      align,
      bold,
      italic,
      strikethrough,
      underline,
      wrapping,
      verticalAlign,
      fillColor,
      textColor,
      fontSize,
    } = styleZone.style; // in pt, not in px!} = styleZone.style;
    return (
      !bold &&
      !italic &&
      !strikethrough &&
      !underline &&
      !fillColor &&
      !textColor &&
      (!align || align === "left") &&
      (!wrapping || wrapping === "overflow") &&
      (!fontSize || fontSize === 10) &&
      (!verticalAlign || verticalAlign === "bottom")
    );
  }

  private borderIsClear(styleZone: StyleZone) {
    const { border, zone } = styleZone;
    return !(
      border &&
      (border.left ||
        border.right ||
        border.top ||
        border.bottom ||
        (border.horizontal && (zone.bottom === undefined || zone.top < zone.bottom)) ||
        (border.vertical && (zone.right === undefined || zone.left < zone.right)))
    );
  }

  private styleZoneIsClear(styleZone: StyleZone) {
    return this.styleIsDefault(styleZone) && this.borderIsClear(styleZone);
  }

  private clearStyle(sheetId: UID, zones: Zone[]) {
    // TODO
  }

  private clearBorders(sheetId: UID, zones: Zone[]) {
    for (const zone of zones) {
      this.removeAndClearAdjacent(sheetId, zone);
    }
  }

  private removeAndClearAdjacent(sheetId: UID, zone: Zone) {
    // TODO keep style in removed zone
    const styles: StyleZone[] = [];
    for (const existingBorder of this.styleAndBorder[sheetId] ?? []) {
      for (const updatedBorderZone of recomputeZones([existingBorder.zone], [zone])) {
        for (const newZone of splitIfAdjacent(updatedBorderZone, zone)) {
          const style = this.getNewStyleZoneFromZone(newZone, existingBorder);
          if (style.border) {
            const adjacentEdge = adjacent(newZone, zone);
            switch (adjacentEdge?.position) {
              case "left":
                style.border.left = undefined;
                break;
              case "right":
                style.border.right = undefined;
                break;
              case "top":
                style.border.top = undefined;
                break;
              case "bottom":
                style.border.bottom = undefined;
                break;
            }
          }
          styles.push(style);
        }
      }
    }
    this.history.update("styleAndBorder", sheetId, styles);
  }

  private setBordersOnZones(sheetId: UID, zones: Zone[], border: ZoneBorderData) {
    for (const zone of zones) {
      this.setStyle(sheetId, this.minimalZone(zone, border), undefined, border);
    }
  }

  private setStyleOnZones(
    sheetId: UID,
    zones: Zone[],
    style: Style | undefined,
    border: ZoneBorderData | undefined,
    option: { forceStyle?: boolean; forceBorder?: boolean } = {
      forceStyle: false,
      forceBorder: false,
    }
  ) {
    for (const zone of zones) {
      this.setStyle(sheetId, zone, style, border, option);
    }
  }
  private setStyle(
    sheetId: UID,
    zone: Zone,
    newStyle?: Style,
    newBorder?: ZoneBorderData,
    option: { forceStyle?: boolean; forceBorder?: boolean } = {
      forceStyle: false,
      forceBorder: false,
    }
  ) {
    const styles: StyleZone[] = [];
    const plannedStyle: StyleZone | undefined =
      newBorder || newStyle ? { zone, border: newBorder, style: newStyle } : undefined;
    let editingZone: Zone[] = [zone];
    for (const existingStyle of this.styleAndBorder[sheetId] ?? []) {
      const inter = intersection(existingStyle.zone, zone);
      if (!inter) {
        styles.push(existingStyle);
        continue;
      }
      if (plannedStyle) {
        const interStyle = this.getNewStyleZoneFromZone(inter, plannedStyle);
        if (newBorder === undefined || !option.forceBorder) {
          interStyle.border = removeFalsyAttributes({
            ...this.getNewStyleZoneFromZone(inter, existingStyle).border,
            ...interStyle.border,
          });
        }
        if (newStyle === undefined || !option.forceStyle) {
          interStyle.style = removeFalsyAttributes({ ...existingStyle.style, ...interStyle.style });
        }
        styles.push(interStyle);
      }
      editingZone = recomputeZones(editingZone, [inter]);
      for (const updatedBorderZone of recomputeZones([existingStyle.zone], [inter])) {
        styles.push(this.getNewStyleZoneFromZone(updatedBorderZone, existingStyle));
      }
    }
    if (plannedStyle) {
      styles.push(...editingZone.map((zone) => this.getNewStyleZoneFromZone(zone, plannedStyle)));
    }
    this.history.update(
      "styleAndBorder",
      sheetId,
      styles.filter((border) => !this.styleZoneIsClear(border))
    );
  }

  private borderDataToNewBorderData(border: BorderData): ZoneBorderData {
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

  private minimalZone(zone: Zone, border: ZoneBorderData): Zone {
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
  private onMerge(sheetId: UID, zone: Zone) {
    const border = {
      ...this.getZoneExternalBorders(sheetId, zone),
      ...removeFalsyAttributes(this.getCellBorder({ sheetId, col: zone.left, row: zone.top })),
    };
    const style = this.getCellStyle({ sheetId, col: zone.left, row: zone.top });
    this.setStyle(sheetId, zone, style, border, { forceBorder: true, forceStyle: true });
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
          this.setStyle(sheetId, positionToZone(position), undefined, border);
        }
      }
    }
    if (Object.keys(data.styles || {}).length) {
      for (const sheet of data.sheets) {
        for (const [position, styleId] of iterateItemIdsPositions(sheet.id, sheet.styles)) {
          const { sheetId } = position;
          const style = data.styles[styleId];
          this.setStyle(sheetId, positionToZone(position), style, undefined);
        }
      }
    }
    // Merges
    for (const sheetData of data.sheets) {
      if (sheetData.merges) {
        for (const merge of sheetData.merges) {
          this.onMerge(sheetData.id, toZone(merge));
        }
      }
    }
  }

  export(data: WorkbookData) {
    const borders: { [borderId: number]: ZoneBorderData } = {};
    const styles: { [styleId: number]: Style } = {};
    for (const sheet of data.sheets) {
      sheet.borders = {};
      sheet.styles = {};
      for (const style of this.styleAndBorder[sheet.id] ?? []) {
        if (style.style) {
          sheet.styles[zoneToXc(style.zone)] = getItemId(
            removeFalsyAttributes(style.style),
            styles
          );
        }
        if (style.border) {
          sheet.borders[zoneToXc(style.zone)] = getItemId(style.border, borders);
        }
      }
    }
    data.borders = borders;
    data.styles = styles;
  }

  exportForExcel(data: ExcelWorkbookData) {
    this.export(data);
  }
}
