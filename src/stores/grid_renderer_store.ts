import { plugin } from "@odoo/owl";
import { HoveredIconPlugin } from "../components/owl_plugins/hovered_icon_plugin";
import { HoveredTablePlugin } from "../components/owl_plugins/hovered_table_plugin";
import { DATA_VALIDATION_CHIP_MARGIN, MIN_CELL_TEXT_MARGIN } from "../constants";
import {
  drawBackground,
  drawBorders,
  drawCellBackground,
  drawFrozenPanes,
  drawFrozenPanesHeaders,
  drawGlobalBackground,
  drawHeaders,
  drawIcon,
  drawOverflowingCellBackground,
  drawTexts,
} from "../helpers/canvas_renderer";
import { formatHasRepeatedChar } from "../helpers/format/format";
import { deepCopy, deepEquals } from "../helpers/misc";
import { recomputeZones } from "../helpers/recompute_zones";
import { computeTextFontSizeInPixels, computeTextLinesHeight } from "../helpers/text_helper";
import { ViewportCollection } from "../helpers/viewport_collection";
import { isZoneInside, overlap, positionToZone, union, zoneToXc } from "../helpers/zones";
import { Model } from "../model";
import { cellAnimationRegistry } from "../registries/cell_animation_registry";
import { DisposableStore } from "../store_engine/store";
import { CellValueType } from "../types/cells";
import { Command } from "../types/commands";
import { RenderingGetters } from "../types/getters";
import { Align, CellPosition, HeaderIndex, UID, Zone } from "../types/misc";
import { Box, GridRenderingContext, LayerName, RenderingBox, Viewport } from "../types/rendering";
import { Get, Store } from "../types/store_engine";
import { FormulaFingerprintStore } from "./formula_fingerprints_store";
import { ModelStore } from "./model_store";
import { RendererStore } from "./renderer_store";

export const CELL_BACKGROUND_GRIDLINE_STROKE_STYLE = "#111";
export const CELL_ANIMATION_DURATION = 200;

interface Animation {
  oldBox: RenderingBox;
  startTime?: number;
  progress: number;
  animationTypes: string[];
}

export class GridRenderer extends DisposableStore {
  private fingerprints: Store<FormulaFingerprintStore>;
  private hoveredTables = plugin(HoveredTablePlugin);
  private hoveredIcon = plugin(HoveredIconPlugin);

  private lastRenderSheetId: UID | undefined = undefined;
  private lastRenderBoxes: Map<string, Box> = new Map();
  private preventNewAnimationsInNextFrame = false;
  private zonesWithPreventedAnimationsInNextFrame: Record<UID, Zone[]> = {};
  private animations: Map<string, Animation> = new Map();
  protected getters: RenderingGetters;

  constructor(get: Get, private renderer: Store<RendererStore> = get(RendererStore)) {
    super(get);
    const model = get(ModelStore) as Model;
    this.getters = model.getters;
    this.fingerprints = get(FormulaFingerprintStore);

    model.on("command-dispatched", this, this.handle);
    model.on("command-finalized", this, this.finalize);
    this.renderer.register(this);

    this.onDispose(() => {
      model.off("command-dispatched", this);
      model.off("command-finalized", this);
      this.renderer.unRegister(this);
    });
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "START":
      case "ACTIVATE_SHEET":
      case "ADD_COLUMNS_ROWS":
      case "REMOVE_COLUMNS_ROWS":
        this.animations.clear();
        this.preventNewAnimationsInNextFrame = true;
        break;
      case "RESIZE_COLUMNS_ROWS":
        this.preventNewAnimationsInNextFrame = true;
        break;
      case "REDO":
        this.zonesWithPreventedAnimationsInNextFrame = {};
        break;
      case "UNDO":
        for (const command of cmd.commands) {
          if (
            command.type === "ADD_COLUMNS_ROWS" ||
            command.type === "REMOVE_COLUMNS_ROWS" ||
            command.type === "RESIZE_COLUMNS_ROWS"
          ) {
            this.animations.clear();
            this.preventNewAnimationsInNextFrame = true;
            break;
          }
        }
        break;
      case "PASTE":
        this.preventNewAnimationsInNextFrame = true;
        break;
      case "UPDATE_CELL":
        const zones = this.getters.getCommandZones(cmd);
        if (!this.zonesWithPreventedAnimationsInNextFrame[cmd.sheetId]) {
          this.zonesWithPreventedAnimationsInNextFrame[cmd.sheetId] = [];
        }
        this.zonesWithPreventedAnimationsInNextFrame[cmd.sheetId].push(...zones);
        break;
    }
  }

  finalize() {
    for (const sheetId in this.zonesWithPreventedAnimationsInNextFrame) {
      this.zonesWithPreventedAnimationsInNextFrame[sheetId] = recomputeZones(
        this.zonesWithPreventedAnimationsInNextFrame[sheetId]
      );
    }
  }

  get renderingLayers() {
    return ["Background", "Headers"] as const;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawLayer(
    renderingContext: GridRenderingContext,
    layer: LayerName,
    timeStamp: number | undefined
  ) {
    switch (layer) {
      case "Background":
        drawGlobalBackground(renderingContext);
        const oldBoxes =
          renderingContext.sheetId === this.lastRenderSheetId ? this.lastRenderBoxes : new Map();
        this.lastRenderSheetId = renderingContext.sheetId;
        this.lastRenderBoxes = new Map();

        const { sheetId, viewports } = renderingContext;
        for (const { zone, rect } of viewports.getAllSheetViewportsZonesAndRect(sheetId)) {
          const { ctx } = renderingContext;
          ctx.save();
          ctx.beginPath();
          ctx.rect(rect.x, rect.y, rect.width, rect.height);
          ctx.clip();
          const boxesWithoutAnimations = this.getGridBoxes(viewports, sheetId, zone);
          const boxes = this.getBoxesWithAnimations(boxesWithoutAnimations, oldBoxes, timeStamp);
          drawBackground(renderingContext, boxes);
          drawOverflowingCellBackground(renderingContext, boxes);
          drawCellBackground(renderingContext, boxes);
          drawBorders(renderingContext, boxes);
          drawTexts(renderingContext, boxes);
          drawIcon(renderingContext, boxes);
          ctx.restore();
        }
        drawFrozenPanes(renderingContext);
        this.preventNewAnimationsInNextFrame = false;
        this.zonesWithPreventedAnimationsInNextFrame = {};
        break;
      case "Headers":
        drawHeaders(renderingContext);
        drawFrozenPanesHeaders(renderingContext);
        break;
    }
  }

  private findNextEmptyCol(
    sheetId: UID,
    base: HeaderIndex,
    max: HeaderIndex,
    row: HeaderIndex
  ): HeaderIndex {
    let col: HeaderIndex = base;
    while (col < max) {
      const position = { sheetId, col: col + 1, row };
      const nextCell = this.getters.getEvaluatedCell(position);
      const nextCellBorder = this.getters.getCellComputedBorder(position);
      const doesCellHaveGridIcon = this.getters.doesCellHaveGridIcon(position);
      if (
        nextCell.type !== CellValueType.empty ||
        this.getters.isInMerge(position) ||
        nextCellBorder?.left ||
        doesCellHaveGridIcon
      ) {
        return col;
      }
      col++;
    }
    return col;
  }

  private findPreviousEmptyCol(
    sheetId: UID,
    base: HeaderIndex,
    min: HeaderIndex,
    row: HeaderIndex
  ): HeaderIndex {
    let col: HeaderIndex = base;
    while (col > min) {
      const position = { sheetId, col: col - 1, row };
      const previousCell = this.getters.getEvaluatedCell(position);
      const previousCellBorder = this.getters.getCellComputedBorder(position);
      const doesCellHaveGridIcon = this.getters.doesCellHaveGridIcon(position);
      if (
        previousCell.type !== CellValueType.empty ||
        this.getters.isInMerge(position) ||
        previousCellBorder?.right ||
        doesCellHaveGridIcon
      ) {
        return col;
      }
      col--;
    }
    return col;
  }

  private computeCellAlignment(position: CellPosition, isOverflowing: boolean): Align {
    const cell = this.getters.getCell(position);
    if (cell?.isFormula && this.getters.shouldShowFormulas()) {
      return "left";
    }
    const { align } = this.getters.getCellStyle(position);
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    if (!align && formatHasRepeatedChar(evaluatedCell.value, evaluatedCell.format)) {
      return "left";
    }
    if (isOverflowing && evaluatedCell.type === CellValueType.number) {
      return align !== "center" ? "left" : align;
    }
    return align || evaluatedCell.defaultAlign;
  }

  private createZoneBox(
    viewports: ViewportCollection,
    sheetId: UID,
    zone: Zone,
    viewport: Viewport
  ): Box {
    const { left, right } = viewport;
    const col: HeaderIndex = zone.left;
    const row: HeaderIndex = zone.top;
    const position = { sheetId, col, row };
    const cell = this.getters.getEvaluatedCell(position);
    const showFormula = this.getters.shouldShowFormulas();
    const rect = viewports.getRect(sheetId, zone);
    const { x, y, width, height } = rect;
    const chipStyle = this.getters.getDataValidationChipStyle(position);

    let style = this.getters.getCellComputedStyle(position);
    if (this.fingerprints.isEnabled) {
      const fingerprintColor = this.fingerprints.colors.get(position);
      style = { ...style, fillColor: fingerprintColor };
    }
    if (chipStyle?.textColor) {
      style = { ...style, textColor: chipStyle.textColor };
    }
    const dataBarFill = this.fingerprints.isEnabled
      ? undefined
      : this.getters.getConditionalDataBar(position);
    const iconsList = this.getters.getCellIcons(position);
    const getRenderingIcon = (position: string) => {
      const icon = iconsList.find((icon) => icon?.horizontalAlign === position);
      if (!icon) {
        return undefined;
      }
      const isHovered = deepEquals(
        { id: icon.type, position: icon.position },
        this.hoveredIcon.hoveredIcon()
      );
      return { ...icon, isHovered, rect: this.getters.getCellIconRect(icon, rect) };
    };
    const cellIcons = {
      left: getRenderingIcon("left"),
      right: getRenderingIcon("right"),
      center: getRenderingIcon("center"),
    };

    const box: Box = {
      id: zoneToXc(zone),
      x,
      y,
      width,
      height,
      border: this.getters.getCellComputedBorder(position) || undefined,
      style,
      dataBarFill,
      overlayColor: this.hoveredTables.overlayColors().get(position),
      isError:
        (cell.type === CellValueType.error && !!cell.message) ||
        this.getters.isDataValidationInvalid(position),
      icons: cellIcons,
      disabledAnimation: this.zonesWithPreventedAnimationsInNextFrame[sheetId]?.some(
        (z) => isZoneInside(zone, z) || overlap(zone, z)
      ),
    };

    const fontSizePX = computeTextFontSizeInPixels(box.style);

    if (cell.type === CellValueType.empty || box.icons.center) {
      return box;
    }

    /** Content */
    const wrapping = style.wrapping || "overflow";
    const wrapText = wrapping === "wrap" && !showFormula;
    const availableWidth = width - 2 * MIN_CELL_TEXT_MARGIN;
    const maxWidth = style.align ? 0 : availableWidth;
    const wrapWidth = wrapText ? availableWidth : undefined;
    const multiLineText = this.getters.getCellMultiLineText(position, {
      maxWidth,
      wrapWidth,
    });
    const noRotatationStyle = { ...style, align: "left" as const, rotation: 0 };
    const textWidth =
      Math.max(...multiLineText.map((line) => this.getters.getTextWidth(line, noRotatationStyle))) +
      MIN_CELL_TEXT_MARGIN;
    const contentSize = this.getters.getMultilineTextSize(multiLineText, style);
    const chipMargin = chipStyle ? DATA_VALIDATION_CHIP_MARGIN : 0;
    const leftIconWidth = box.icons.left ? box.icons.left.size + box.icons.left.margin : 0;
    const leftMargin = leftIconWidth + chipMargin;
    const rightIconWidth = box.icons.right ? box.icons.right.size + box.icons.right.margin : 0;
    const rightMargin = rightIconWidth + chipMargin;
    const contentWidth = leftMargin + contentSize.width + rightMargin + MIN_CELL_TEXT_MARGIN;
    const align = this.computeCellAlignment(position, contentWidth > width);

    // compute vertical align start point parameter:
    const numberOfLines = multiLineText.length;
    const contentY = Math.round(
      this.getters.computeTextYCoordinate(box, fontSizePX, style.verticalAlign, numberOfLines)
    );

    // compute horizontal align start point parameter
    let contentX = box.x;
    if (align === "left") {
      contentX += MIN_CELL_TEXT_MARGIN + leftMargin;
    } else if (align === "right") {
      contentX += box.width - MIN_CELL_TEXT_MARGIN - rightMargin;
    } else {
      contentX += box.width / 2;
    }
    contentX = Math.round(contentX);

    const textHeight = computeTextLinesHeight(fontSizePX, numberOfLines);
    box.content = {
      textLines: multiLineText,
      width: wrapping === "overflow" ? textWidth : width,
      textHeight,
      textWidth,
      align,
      x: contentX,
      y: contentY,
      fontSizePx: fontSizePX,
    };
    if (chipStyle?.fillColor) {
      const chipMarginLeft = leftMargin;
      const chipMarginRight = DATA_VALIDATION_CHIP_MARGIN;
      box.chip = {
        color: chipStyle.fillColor,
        width: box.width - chipMarginLeft - chipMarginRight,
        height: textHeight + 2,
        x: box.x + chipMarginLeft,
        y: contentY - 2,
      };
    }

    /** ClipRect */
    const isOverflowing = contentWidth > width || contentSize.height > height;
    if (box.icons.left || box.icons.right || box.chip) {
      box.clipRect = {
        x: box.x + leftMargin,
        y: box.y,
        width: Math.max(0, width - leftMargin - rightMargin),
        height,
      };
    } else if (isOverflowing && wrapping === "overflow") {
      let nextColIndex: number, previousColIndex: number;

      const isCellInMerge = this.getters.isInMerge(position);
      if (isCellInMerge) {
        // Always clip merges
        nextColIndex = this.getters.getMerge(position)!.right;
        previousColIndex = col;
      } else {
        nextColIndex = box.border?.right
          ? zone.right
          : this.findNextEmptyCol(sheetId, col, right, row);
        previousColIndex = box.border?.left
          ? zone.left
          : this.findPreviousEmptyCol(sheetId, col, left, row);
        box.isOverflow = true;
      }

      switch (align) {
        case "left": {
          const emptyZoneOnTheLeft = positionToZone({ col: nextColIndex, row });
          const { x, y, width, height } = viewports.getVisibleRect(
            sheetId,
            union(zone, emptyZoneOnTheLeft)
          );
          if (width < contentWidth || fontSizePX > height || multiLineText.length > 1) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "right": {
          const emptyZoneOnTheRight = positionToZone({ col: previousColIndex, row });
          const { x, y, width, height } = viewports.getVisibleRect(
            sheetId,
            union(zone, emptyZoneOnTheRight)
          );
          if (width < contentWidth || fontSizePX > height || multiLineText.length > 1) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "center": {
          const emptyZone = {
            ...zone,
            left: previousColIndex,
            right: nextColIndex,
          };
          const { x, y, height, width } = viewports.getVisibleRect(sheetId, emptyZone);
          const halfContentWidth = contentWidth / 2;
          const boxMiddle = box.x + box.width / 2;
          if (
            x + width < boxMiddle + halfContentWidth ||
            x > boxMiddle - halfContentWidth ||
            fontSizePX > height ||
            multiLineText.length > 1
          ) {
            const clipX = x > boxMiddle - halfContentWidth ? x : boxMiddle - halfContentWidth;
            const clipWidth = x + width - clipX;
            box.clipRect = { x: clipX, y, width: clipWidth, height };
          }
          break;
        }
      }
    } else if (wrapping === "clip" || wrapping === "wrap" || multiLineText.length > 1) {
      box.clipRect = {
        x: box.x,
        y: box.y,
        width,
        height,
      };
    }

    return box;
  }

  private getGridBoxes(viewports: ViewportCollection, sheetId: UID, zone: Zone): Box[] {
    const boxes: Box[] = [];

    const visibleCols = viewports
      .getSheetViewVisibleCols(sheetId)
      .filter((col) => col >= zone.left && col <= zone.right);
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = viewports
      .getSheetViewVisibleRows(sheetId)
      .filter((row) => row >= zone.top && row <= zone.bottom);
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
    const viewport = { left, right, top, bottom };

    for (const row of visibleRows) {
      for (const col of visibleCols) {
        const position = { sheetId, col, row };
        if (this.getters.isInMerge(position)) {
          continue;
        }
        boxes.push(this.createZoneBox(viewports, sheetId, positionToZone(position), viewport));
      }
    }
    for (const merge of this.getters.getMerges(sheetId)) {
      if (this.getters.isMergeHidden(sheetId, merge)) {
        continue;
      }
      if (overlap(merge, viewport)) {
        const box = this.createZoneBox(viewports, sheetId, merge, viewport);
        const borderBottomRight = this.getters.getCellComputedBorder({
          sheetId,
          col: merge.right,
          row: merge.bottom,
        });
        box.border = {
          ...box.border,
          bottom: borderBottomRight ? borderBottomRight.bottom : undefined,
          right: borderBottomRight ? borderBottomRight.right : undefined,
        };
        box.isMerge = true;
        boxes.push(box);
      }
    }
    return boxes;
  }

  private getBoxesWithAnimations(
    boxes: Box[],
    oldBoxes: Map<string, Box>,
    timeStamp: number | undefined
  ) {
    this.updateAnimationsProgress(timeStamp);
    this.addNewAnimations(boxes, oldBoxes, timeStamp);

    if (this.animations.size > 0) {
      this.renderer.startAnimation("grid_renderer_animation");
      return this.updateBoxesWithAnimations(boxes);
    } else {
      this.renderer.stopAnimation("grid_renderer_animation");
      return boxes;
    }
  }

  private updateBoxesWithAnimations(boxes: Box[]) {
    const boxesWithAnimations: Box[] = [];
    for (const box of boxes) {
      const animation = this.animations.get(box.id);
      if (!animation) {
        boxesWithAnimations.push(box);
        continue;
      }

      const animatedBox = deepCopy(box);
      boxesWithAnimations.push(animatedBox);
      for (const animationId of animation.animationTypes) {
        const animationItem = cellAnimationRegistry.get(animationId);
        const newBoxes = animationItem.updateAnimation(
          animation.progress,
          animatedBox,
          animation.oldBox,
          box
        );
        if (newBoxes) {
          boxesWithAnimations.push(...newBoxes.newBoxes);
        }
      }
    }

    return boxesWithAnimations;
  }

  private updateAnimationsProgress(timeStamp: number | undefined) {
    if (timeStamp === undefined) {
      return;
    }
    for (const boxId of this.animations.keys()) {
      const animation = this.animations.get(boxId)!;
      if (animation.startTime === undefined) {
        animation.startTime = timeStamp;
        continue;
      }
      const elapsedTime = timeStamp - animation.startTime;
      const progress = Math.min(1, elapsedTime / CELL_ANIMATION_DURATION);
      if (progress >= 1) {
        this.animations.delete(boxId);
      }
      animation.progress = progress;
    }
  }

  private addNewAnimations(
    boxes: Box[],
    oldBoxes: Map<string, Box>,
    timeStamp: number | undefined
  ) {
    for (const box of boxes) {
      this.lastRenderBoxes.set(box.id, box);
      const oldBox = oldBoxes.get(box.id);
      if (this.preventNewAnimationsInNextFrame || !oldBox || box.disabledAnimation) {
        continue;
      }

      const animationTypes: string[] = [];
      for (const animationItem of cellAnimationRegistry.getAll()) {
        if (animationItem.hasAnimation(oldBox, box)) {
          animationTypes.push(animationItem.id);
        }
      }

      const animation =
        animationTypes.length > 0
          ? { animationTypes, oldBox, progress: 0, startTime: timeStamp }
          : undefined;

      if (animation) {
        this.animations.set(box.id, animation);
      }
    }
  }
}
