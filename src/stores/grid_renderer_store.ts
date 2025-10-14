import { ModelStore, SpreadsheetStore } from ".";
import { HoveredIconStore } from "../components/grid_overlay/hovered_icon_store";
import { getPath2D } from "../components/icons/icons";
import { HoveredTableStore } from "../components/tables/hovered_table_store";
import {
  BACKGROUND_HEADER_ACTIVE_COLOR,
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  CANVAS_SHIFT,
  CELL_BORDER_COLOR,
  DATA_VALIDATION_CHIP_MARGIN,
  DEFAULT_FONT,
  FROZEN_PANE_BORDER_COLOR,
  FROZEN_PANE_HEADER_BORDER_COLOR,
  HEADER_BORDER_COLOR,
  HEADER_FONT_SIZE,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MIN_CELL_TEXT_MARGIN,
  TEXT_HEADER_COLOR,
} from "../constants";
import {
  computeTextFont,
  computeTextFontSizeInPixels,
  computeTextLinesHeight,
  deepCopy,
  deepEquals,
  drawDecoratedText,
  formatHasRepeatedChar,
  getZonesCols,
  getZonesRows,
  isZoneInside,
  numberToLetters,
  overlap,
  positionToZone,
  union,
  zoneToXc,
} from "../helpers/index";
import { cellAnimationRegistry } from "../registries/cell_animation_registry";
import { Get, Store } from "../store_engine";
import {
  Align,
  BorderDescrWithOpacity,
  Box,
  CellPosition,
  CellValueType,
  Command,
  GridRenderingContext,
  HeaderIndex,
  LayerName,
  Pixel,
  RenderingBox,
  UID,
  Viewport,
  Zone,
} from "../types/index";
import { FormulaFingerprintStore } from "./formula_fingerprints_store";

export const CELL_BACKGROUND_GRIDLINE_STROKE_STYLE = "#111";
export const CELL_ANIMATION_DURATION = 200;

interface Animation {
  oldBox: RenderingBox;
  startTime?: number;
  progress: number;
  animationTypes: string[];
}

export class GridRenderer extends SpreadsheetStore {
  private fingerprints: Store<FormulaFingerprintStore>;
  private hoveredTables: Store<HoveredTableStore>;
  private hoveredIcon: Store<HoveredIconStore>;

  private lastRenderBoxes: Map<string, Box> = new Map();
  private preventNewAnimationsInNextFrame = false;
  private zonesWithPreventedAnimationsInNextFrame: Zone[] = [];
  private animations: Map<string, Animation> = new Map();

  constructor(get: Get) {
    super(get);
    this.getters = get(ModelStore).getters;
    this.fingerprints = get(FormulaFingerprintStore);
    this.hoveredTables = get(HoveredTableStore);
    this.hoveredIcon = get(HoveredIconStore);
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
        this.zonesWithPreventedAnimationsInNextFrame = [];
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
        this.zonesWithPreventedAnimationsInNextFrame.push(...this.getters.getSelectedZones());
        break;
      case "UPDATE_CELL":
        const zones = this.getters.getCommandZones(cmd);
        this.zonesWithPreventedAnimationsInNextFrame.push(...zones);
        break;
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
        this.drawGlobalBackground(renderingContext);
        const oldBoxes = this.lastRenderBoxes;
        this.lastRenderBoxes = new Map();

        for (const { zone, rect } of this.getters.getAllActiveViewportsZonesAndRect()) {
          const { ctx } = renderingContext;
          ctx.save();
          ctx.beginPath();
          ctx.rect(rect.x, rect.y, rect.width, rect.height);
          ctx.clip();
          const boxesWithoutAnimations = this.getGridBoxes(zone);
          const boxes = this.getBoxesWithAnimations(boxesWithoutAnimations, oldBoxes, timeStamp);
          this.drawBackground(renderingContext, boxes);
          this.drawOverflowingCellBackground(renderingContext, boxes);
          this.drawCellBackground(renderingContext, boxes);
          this.drawBorders(renderingContext, boxes);
          this.drawTexts(renderingContext, boxes);
          this.drawIcon(renderingContext, boxes);
          ctx.restore();
        }
        this.drawFrozenPanes(renderingContext);
        this.preventNewAnimationsInNextFrame = false;
        this.zonesWithPreventedAnimationsInNextFrame = [];
        break;
      case "Headers":
        if (!this.getters.isDashboard()) {
          this.drawHeaders(renderingContext);
          this.drawFrozenPanesHeaders(renderingContext);
        }
        break;
    }
  }

  private drawGlobalBackground(renderingContext: GridRenderingContext) {
    const { ctx } = renderingContext;
    const { width, height } = this.getters.getSheetViewDimensionWithHeaders();

    // white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width + CANVAS_SHIFT, height + CANVAS_SHIFT);
  }

  private drawBackground(renderingContext: GridRenderingContext, boxes: Box[]) {
    const { ctx, thinLineWidth } = renderingContext;

    const areGridLinesVisible =
      !this.getters.isDashboard() &&
      this.getters.getGridLinesVisibility(this.getters.getActiveSheetId());
    const inset = areGridLinesVisible ? 0.1 * thinLineWidth : 0;

    if (areGridLinesVisible) {
      for (const box of boxes) {
        if (box.skipCellGridLines) continue;
        ctx.strokeStyle = CELL_BORDER_COLOR;
        ctx.lineWidth = thinLineWidth;
        ctx.strokeRect(box.x + inset, box.y + inset, box.width - 2 * inset, box.height - 2 * inset);
      }
    }
  }

  private drawCellBackground(renderingContext: GridRenderingContext, boxes: Box[]) {
    const { ctx } = renderingContext;
    for (const box of boxes) {
      const style = box.style;
      if (style.fillColor && style.fillColor !== "#ffffff") {
        ctx.fillStyle = style.fillColor || "#ffffff";
        ctx.fillRect(box.x, box.y, box.width, box.height);
      }
      if (box.dataBarFill) {
        ctx.fillStyle = box.dataBarFill.color;
        const percentage = box.dataBarFill.percentage;
        const width = box.width * (percentage / 100);
        ctx.fillRect(box.x, box.y, width, box.height);
      }
      if (box?.chip) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x, box.y, box.width, box.height);
        ctx.clip();
        const chip = box.chip;
        ctx.fillStyle = chip.color;
        const radius = 10;
        ctx.beginPath();
        ctx.roundRect(chip.x, chip.y, chip.width, chip.height, radius);
        ctx.fill();
        ctx.restore();
      }
      if (box.overlayColor) {
        ctx.fillStyle = box.overlayColor;
        ctx.fillRect(box.x, box.y, box.width, box.height);
      }
      if (box.isError) {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.moveTo(box.x + box.width - 5, box.y);
        ctx.lineTo(box.x + box.width, box.y);
        ctx.lineTo(box.x + box.width, box.y + 5);
        ctx.fill();
      }
    }
  }

  private drawOverflowingCellBackground(renderingContext: GridRenderingContext, boxes: Box[]) {
    const { ctx, thinLineWidth } = renderingContext;
    for (const box of boxes) {
      if (box.content && box.isOverflow) {
        const align = box.content.align || "left";
        let x: number;
        let width: number;
        const y = box.y + thinLineWidth / 2;
        const height = box.height - thinLineWidth;
        const clipWidth = Math.min(box.clipRect?.width || Infinity, box.content.width);
        if (align === "left") {
          x = box.x + thinLineWidth / 2;
          width = clipWidth - 2 * thinLineWidth;
        } else if (align === "right") {
          x = box.x + box.width - thinLineWidth / 2;
          width = -clipWidth + 2 * thinLineWidth;
        } else {
          x =
            (box.clipRect?.x || box.x + box.width / 2 - box.content.width / 2) + thinLineWidth / 2;
          width = clipWidth - 2 * thinLineWidth;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, width, height);
      }
    }
  }

  private drawBorders(renderingContext: GridRenderingContext, boxes: Box[]) {
    const { ctx } = renderingContext;
    for (const box of boxes) {
      const border = box.border;
      if (border) {
        const { x, y, width, height } = box;
        if (border.left) {
          drawBorder(border.left, x, y, x, y + height);
        }
        if (border.top) {
          drawBorder(border.top, x, y, x + width, y);
        }
        if (border.right) {
          drawBorder(border.right, x + width, y, x + width, y + height);
        }
        if (border.bottom) {
          drawBorder(border.bottom, x, y + height, x + width, y + height);
        }
      }
    }

    /**
     * Following https://usefulangle.com/post/17/html5-canvas-drawing-1px-crisp-straight-lines,
     * we need to make sure that a "single" pixel line is drawn on a "half" pixel coordinate,
     * while a "double" pixel line is drawn on a "full" pixel coordinate. As, in the rendering
     * process, we always had 0.5 before rendering line (to make sure it is drawn on a "half"
     * pixel), we need to correct this behavior for the "medium" and the "dotted" styles, as
     * they are drawing a two pixels width line.
     * We also adapt here the coordinates of the line to make sure corner are correctly drawn,
     * avoiding a "round corners" effect. This is done by subtracting 1 pixel to the origin of
     * each line and adding 1 pixel to the end of each line (depending on the direction of the
     * line).
     */
    function drawBorder(
      { color, style, opacity }: BorderDescrWithOpacity,
      x1: Pixel,
      y1: Pixel,
      x2: Pixel,
      y2: Pixel
    ) {
      ctx.globalAlpha = opacity ?? 1;
      ctx.strokeStyle = color;
      switch (style) {
        case "medium":
          ctx.lineWidth = 2;
          x1 += y1 === y2 ? -0.5 : 0.5;
          x2 += y1 === y2 ? 1.5 : 0.5;
          y1 += x1 === x2 ? -0.5 : 0.5;
          y2 += x1 === x2 ? 1.5 : 0.5;
          break;
        case "thick":
          ctx.lineWidth = 3;
          if (y1 === y2) {
            x1--;
            x2++;
          }
          if (x1 === x2) {
            y1--;
            y2++;
          }
          break;
        case "dashed":
          ctx.lineWidth = 1;
          ctx.setLineDash([1, 3]);
          break;
        case "dotted":
          ctx.lineWidth = 1;
          if (y1 === y2) {
            x1 += 0.5;
            x2 += 0.5;
          }
          if (x1 === x2) {
            y1 += 0.5;
            y2 += 0.5;
          }
          ctx.setLineDash([1, 1]);
          break;
        case "thin":
        default:
          ctx.lineWidth = 1;
          break;
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  private drawTexts(renderingContext: GridRenderingContext, boxes: Box[]) {
    const { ctx } = renderingContext;
    ctx.textBaseline = "top";
    let currentFont;
    for (const box of boxes) {
      if (box.content) {
        ctx.globalAlpha = box.textOpacity ?? 1;
        const style = box.style || {};
        const align = box.content.align || "left";

        // compute font and textColor
        const font = computeTextFont(style);
        if (font !== currentFont) {
          currentFont = font;
          ctx.font = font;
        }
        ctx.fillStyle = style.textColor || "#000";

        // horizontal align text direction
        ctx.textAlign = align;

        // clip rect if needed
        if (box.clipRect) {
          ctx.save();
          ctx.beginPath();
          const { x, y, width, height } = box.clipRect;
          ctx.rect(x, y, width, height);
          ctx.clip();
        }
        const x = box.content.x;
        let y = box.content.y;
        // ctx.fillStyle = "#f00";
        // ctx.fillRect(box.content.x, box.content.y, box.content.width, 3);

        if (box.style.rotation) {
          this.drawRotatedText(box, ctx);
        } else {
          // use the horizontal and the vertical start points to:
          // fill text / fill strikethrough / fill underline
          for (const brokenLine of box.content.textLines) {
            drawDecoratedText(ctx, brokenLine, { x, y }, style.underline, style.strikethrough);
            y += MIN_CELL_TEXT_MARGIN + box.content.fontSizePx;
          }
        }

        if (box.clipRect) {
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // ADRM TODO: make this a helper ? Or maybe move it inside the box creation, since this is where
  // we compute the text x/y
  private drawRotatedText(box: Box, ctx: CanvasRenderingContext2D) {
    const style = box.style;
    if (!box.content || !style.rotation) {
      return;
    }
    let x = 0;
    let y = 0;

    const angle = style.rotation * (Math.PI / 180);
    const lineHeight = MIN_CELL_TEXT_MARGIN + box.content.fontSizePx;

    // TODO
    // Doesn't work for align other than left
    // Doesn't work for angles not (-90 < angle < 0)
    // Doesn't work when there is a CF icon
    // For vertical text (angle = -90), the space between the start of cell is too big
    // Is kinda ok for long text, ugly for small texts
    ctx.save();
    ctx.translate(
      box.x + lineHeight * Math.sin(-angle),
      box.y + box.height - lineHeight * Math.cos(angle) - MIN_CELL_TEXT_MARGIN
    );
    x = 0;
    y = 0;
    console.log({ x, y });
    ctx.rotate(angle);

    for (const brokenLine of box.content.textLines) {
      drawDecoratedText(ctx, brokenLine, { x, y }, style.underline, style.strikethrough);
      y += lineHeight;
      x += lineHeight / Math.abs(Math.tan(angle));
    }

    ctx.restore();
  }

  private drawIcon(renderingContext: GridRenderingContext, boxes: Box[]) {
    const { ctx } = renderingContext;
    for (const box of boxes) {
      for (const icon of Object.values(box.icons)) {
        if (!icon) {
          continue;
        }
        const isHovered = deepEquals(
          { id: icon.type, position: icon.position },
          this.hoveredIcon.hoveredIcon
        );
        const svg = isHovered ? icon.hoverSvg || icon.svg : icon.svg;
        if (!svg) {
          continue;
        }
        ctx.save();
        ctx.globalAlpha = icon.opacity ?? 1;
        ctx.beginPath();
        const clipRect = icon.clipRect || box;
        ctx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
        ctx.clip();

        const iconSize = icon.size;
        const { x, y } = this.getters.getCellIconRect(icon, box);
        ctx.translate(x, y);
        ctx.scale(iconSize / svg.width, iconSize / svg.height);
        for (const path of svg.paths) {
          ctx.fillStyle = path.fillColor;
          ctx.fill(getPath2D(path.path));
        }
        ctx.restore();
      }
    }
  }

  private drawHeaders(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;
    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const { width, height } = this.getters.getSheetViewDimensionWithHeaders();
    const selection = this.getters.getSelectedZones();
    const selectedCols = getZonesCols(selection);
    const selectedRows = getZonesRows(selection);
    const sheetId = this.getters.getActiveSheetId();
    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOfRows = this.getters.getNumberRows(sheetId);
    const activeCols = this.getters.getActiveCols();
    const activeRows = this.getters.getActiveRows();

    ctx.font = `400 ${HEADER_FONT_SIZE}px ${DEFAULT_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = thinLineWidth;
    ctx.strokeStyle = "#333";

    // Columns headers background
    for (const col of visibleCols) {
      const colZone = { left: col, right: col, top: 0, bottom: numberOfRows - 1 };
      const { x, width } = this.getters.getVisibleRect(colZone);
      const isColActive = activeCols.has(col);
      const isColSelected = selectedCols.has(col);
      if (isColActive) {
        ctx.fillStyle = BACKGROUND_HEADER_ACTIVE_COLOR;
      } else if (isColSelected) {
        ctx.fillStyle = BACKGROUND_HEADER_SELECTED_COLOR;
      } else {
        ctx.fillStyle = BACKGROUND_HEADER_COLOR;
      }
      ctx.fillRect(x, 0, width, HEADER_HEIGHT);
    }

    // Rows headers background
    for (const row of visibleRows) {
      const rowZone = { top: row, bottom: row, left: 0, right: numberOfCols - 1 };
      const { y, height } = this.getters.getVisibleRect(rowZone);

      const isRowActive = activeRows.has(row);
      const isRowSelected = selectedRows.has(row);
      if (isRowActive) {
        ctx.fillStyle = BACKGROUND_HEADER_ACTIVE_COLOR;
      } else if (isRowSelected) {
        ctx.fillStyle = BACKGROUND_HEADER_SELECTED_COLOR;
      } else {
        ctx.fillStyle = BACKGROUND_HEADER_COLOR;
      }
      ctx.fillRect(0, y, HEADER_WIDTH, height);
    }

    // 2 main lines
    ctx.beginPath();
    ctx.moveTo(HEADER_WIDTH, 0);
    ctx.lineTo(HEADER_WIDTH, height);
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(width, HEADER_HEIGHT);
    ctx.strokeStyle = HEADER_BORDER_COLOR;
    ctx.stroke();

    // column text + separator
    for (const col of visibleCols) {
      const colName = numberToLetters(col);
      ctx.fillStyle = activeCols.has(col) ? "#fff" : TEXT_HEADER_COLOR;
      const zone = { left: col, right: col, top: top, bottom: top };
      const { x: colStart, width: colSize } = this.getters.getRect(zone);
      const { x, width } = this.getters.getVisibleRect(zone);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, width, HEADER_HEIGHT);
      ctx.clip();
      ctx.fillText(colName, colStart + colSize / 2, HEADER_HEIGHT / 2);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(colStart + colSize, 0);
      ctx.lineTo(colStart + colSize, HEADER_HEIGHT);
      ctx.stroke();
    }

    // row text + separator
    for (const row of visibleRows) {
      ctx.fillStyle = activeRows.has(row) ? "#fff" : TEXT_HEADER_COLOR;
      const zone = { top: row, bottom: row, left: left, right: left };
      const { y: rowStart, height: rowSize } = this.getters.getRect(zone);
      const { y, height } = this.getters.getVisibleRect(zone);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, HEADER_WIDTH, height);
      ctx.clip();
      ctx.fillText(String(row + 1), HEADER_WIDTH / 2, rowStart + rowSize / 2);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(0, rowStart + rowSize);
      ctx.lineTo(HEADER_WIDTH, rowStart + rowSize);
      ctx.stroke();
    }
  }

  private drawFrozenPanesHeaders(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;

    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.getters.getMainViewportCoordinates();
    const widthCorrection = this.getters.isDashboard() ? 0 : HEADER_WIDTH;
    const heightCorrection = this.getters.isDashboard() ? 0 : HEADER_HEIGHT;
    ctx.lineWidth = 6 * thinLineWidth;
    ctx.strokeStyle = FROZEN_PANE_HEADER_BORDER_COLOR;
    ctx.beginPath();
    if (offsetCorrectionX) {
      ctx.moveTo(widthCorrection + offsetCorrectionX, 0);
      ctx.lineTo(widthCorrection + offsetCorrectionX, heightCorrection);
    }
    if (offsetCorrectionY) {
      ctx.moveTo(0, heightCorrection + offsetCorrectionY);
      ctx.lineTo(widthCorrection, heightCorrection + offsetCorrectionY);
    }
    ctx.stroke();
  }

  private drawFrozenPanes(renderingContext: GridRenderingContext) {
    const { ctx, thinLineWidth } = renderingContext;

    const { x: offsetCorrectionX, y: offsetCorrectionY } =
      this.getters.getMainViewportCoordinates();

    const visibleCols = this.getters.getSheetViewVisibleCols();
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = this.getters.getSheetViewVisibleRows();
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
    const viewport = { left, right, top, bottom };

    const rect = this.getters.getVisibleRect(viewport);
    const widthCorrection = this.getters.isDashboard() ? 0 : HEADER_WIDTH;
    const heightCorrection = this.getters.isDashboard() ? 0 : HEADER_HEIGHT;
    ctx.lineWidth = 6 * thinLineWidth;
    ctx.strokeStyle = FROZEN_PANE_BORDER_COLOR;
    ctx.beginPath();
    if (offsetCorrectionX) {
      ctx.moveTo(widthCorrection + offsetCorrectionX, heightCorrection);
      ctx.lineTo(widthCorrection + offsetCorrectionX, rect.height + heightCorrection);
    }
    if (offsetCorrectionY) {
      ctx.moveTo(widthCorrection, heightCorrection + offsetCorrectionY);
      ctx.lineTo(rect.width + widthCorrection, heightCorrection + offsetCorrectionY);
    }
    ctx.stroke();
  }

  private findNextEmptyCol(base: HeaderIndex, max: HeaderIndex, row: HeaderIndex): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
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

  private findPreviousEmptyCol(base: HeaderIndex, min: HeaderIndex, row: HeaderIndex): HeaderIndex {
    const sheetId = this.getters.getActiveSheetId();
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
    if (formatHasRepeatedChar(evaluatedCell.value, evaluatedCell.format)) {
      return "left";
    }
    if (isOverflowing && evaluatedCell.type === CellValueType.number) {
      return align !== "center" ? "left" : align;
    }
    return align || evaluatedCell.defaultAlign;
  }

  private createZoneBox(sheetId: UID, zone: Zone, viewport: Viewport, precomputeZone: Zone): Box {
    const { left, right } = viewport;
    const col: HeaderIndex = zone.left;
    const row: HeaderIndex = zone.top;
    const position = { sheetId, col, row };
    const cell = this.getters.getEvaluatedCell(position);
    const showFormula = this.getters.shouldShowFormulas();
    const { x, y, width, height } = this.getters.getRect(zone);
    const chipStyle = this.getters.getDataValidationChipStyle(position);
    const border = this.getters.getCellComputedBorder(position, precomputeZone);

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
    const cellIcons = {
      left: iconsList.find((icon) => icon?.horizontalAlign === "left"),
      right: iconsList.find((icon) => icon?.horizontalAlign === "right"),
      center: iconsList.find((icon) => icon?.horizontalAlign === "center"),
    };

    const box: Box = {
      id: zoneToXc(zone),
      x,
      y,
      width,
      height,
      border: border || undefined,
      style,
      dataBarFill,
      overlayColor: this.hoveredTables.overlayColors.get(position),
      isError:
        (cell.type === CellValueType.error && !!cell.message) ||
        this.getters.isDataValidationInvalid(position),
      icons: cellIcons,
      disabledAnimation: this.zonesWithPreventedAnimationsInNextFrame.some(
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
    const maxWidth = width - 2 * MIN_CELL_TEXT_MARGIN;
    const multiLineText = this.getters.getCellMultiLineText(position, { maxWidth, wrapText });
    const textWidth = Math.max(
      ...multiLineText.map((line) => this.getters.getTextWidth(line, style) + MIN_CELL_TEXT_MARGIN)
    );
    const chipMargin = chipStyle ? DATA_VALIDATION_CHIP_MARGIN : 0;
    const leftIconWidth = box.icons.left ? box.icons.left.size + box.icons.left.margin : 0;
    const leftMargin = leftIconWidth + chipMargin;
    const rightIconWidth = box.icons.right ? box.icons.right.size + box.icons.right.margin : 0;
    const rightMargin = rightIconWidth + chipMargin;
    const contentWidth = leftMargin + textWidth + rightMargin;
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
    const isOverflowing = contentWidth > width || fontSizePX > height;
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
        nextColIndex = box.border?.right ? zone.right : this.findNextEmptyCol(col, right, row);
        previousColIndex = box.border?.left ? zone.left : this.findPreviousEmptyCol(col, left, row);
        box.isOverflow = true;
      }

      switch (align) {
        case "left": {
          const emptyZoneOnTheLeft = positionToZone({ col: nextColIndex, row });
          const { x, y, width, height } = this.getters.getVisibleRect(
            union(zone, emptyZoneOnTheLeft)
          );
          if (width < contentWidth || fontSizePX > height || multiLineText.length > 1) {
            box.clipRect = { x, y, width, height };
          }
          break;
        }
        case "right": {
          const emptyZoneOnTheRight = positionToZone({ col: previousColIndex, row });
          const { x, y, width, height } = this.getters.getVisibleRect(
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
          const { x, y, height, width } = this.getters.getVisibleRect(emptyZone);
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

  private getGridBoxes(zone: Zone): Box[] {
    const boxes: Box[] = [];

    const visibleCols = this.getters
      .getSheetViewVisibleCols()
      .filter((col) => col >= zone.left && col <= zone.right);
    const left = visibleCols[0];
    const right = visibleCols[visibleCols.length - 1];
    const visibleRows = this.getters
      .getSheetViewVisibleRows()
      .filter((row) => row >= zone.top && row <= zone.bottom);
    const top = visibleRows[0];
    const bottom = visibleRows[visibleRows.length - 1];
    const viewport = { left, right, top, bottom };
    const sheetId = this.getters.getActiveSheetId();

    for (const row of visibleRows) {
      for (const col of visibleCols) {
        const position = { sheetId, col, row };
        if (this.getters.isInMerge(position)) {
          continue;
        }
        boxes.push(this.createZoneBox(sheetId, positionToZone(position), viewport, zone));
      }
    }
    for (const merge of this.getters.getMerges(sheetId)) {
      if (this.getters.isMergeHidden(sheetId, merge)) {
        continue;
      }
      if (overlap(merge, viewport)) {
        const box = this.createZoneBox(sheetId, merge, viewport, zone);
        const borderBottomRight = this.getters.getCellComputedBorder(
          {
            sheetId,
            col: merge.right,
            row: merge.bottom,
          },
          zone
        );
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
