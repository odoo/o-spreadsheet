import { Component, useEffect, useRef, useState } from "@odoo/owl";
import { CANVAS_SHIFT, GRAY_300, SELECTION_BORDER_COLOR } from "../../../constants";
import { clip, isDefined, zoneToDimension } from "../../../helpers";
import { CSSProperties, Figure, OrderedLayers, Pixel, SpreadsheetChildEnv } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers";
import { startDnd } from "../../helpers/drag_and_drop";
import { ShittyGridRenderer, ShittyRendererParams } from "./shitty_grid_renderer_store";

interface Props {
  figure: Figure;
  onFigureDeleted: () => void;
}

css/* scss */ `
  .o-viewport-figure {
    .o-handle {
      cursor: e-resize;
    }
  }
`;

interface State {
  partialHeaderDimensions: {
    COL: Record<number, number | undefined>;
    ROW: Record<number, number | undefined>;
  };
  hoveredCol: number | undefined;
  hoveredRow: number | undefined;
  resizedCol: number | undefined;
  resizedRow: number | undefined;
}

export class ViewportFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ViewportFigure";
  static props = {
    figure: Object,
    onFigureDeleted: Function,
  };
  static components = {};

  private canvasRef = useRef("canvas");

  state = useState<State>({
    partialHeaderDimensions: this.figureViewport.headerDimensions || { COL: {}, ROW: {} },
    hoveredCol: undefined,
    hoveredRow: undefined,
    resizedCol: undefined,
    resizedRow: undefined,
  });

  setup() {
    useEffect(() => {
      this.drawGrid();
    });
  }

  drawGrid() {
    const figureViewport = this.env.model.getters.getFigureViewport(
      this.env.model.getters.getActiveSheetId(),
      this.props.figure.id
    );
    const canvas = this.canvasRef.el as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const thinLineWidth = 0.4 * dpr;
    const renderingContext = {
      ctx,
      dpr,
      thinLineWidth,
    };
    const { width, height } = canvas.getBoundingClientRect();
    // const { width, height } = this.env.model.getters.getVisibleRect(figureViewport.zone);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.setAttribute("style", `width:${width}px;height:${height}px;`);
    ctx.translate(-CANVAS_SHIFT, -CANVAS_SHIFT);
    ctx.scale(dpr, dpr);

    const renderer = new ShittyGridRenderer(this.env.model.getters, {
      ...figureViewport,
      size: this.props.figure,
      headerDimensions: this.getFullHeaderDimensions(),
    });

    for (const layer of OrderedLayers()) {
      renderer.drawLayer(renderingContext, layer);
    }
  }

  getStartingHeaderDimensions(): ShittyRendererParams["headerDimensions"] {
    const { height, width } = this.canvasRef.el!.getBoundingClientRect();

    const zone = this.figureViewport.zone;
    const numberOfCols = zone.right - zone.left + 1;
    const numberOfRows = zone.bottom - zone.top + 1;

    const COL = {};
    // ADRM: if we're not using rounding, the grid lines starts to get blurry since we draw them in between pixels
    // but on the other hand we want to make sure the grid fills the whole figure
    let roundingError = 0;
    for (let col = zone.left; col <= zone.right; col++) {
      COL[col] = Math.round(width / numberOfCols);
      roundingError += width / numberOfCols - COL[col];
    }
    if (roundingError > 0) {
      COL[zone.right] += roundingError;
    }
    const ROW = {};
    roundingError = 0;
    for (let row = zone.top; row <= zone.bottom; row++) {
      ROW[row] = Math.round(height / numberOfRows);
      roundingError += height / numberOfRows - ROW[row];
    }
    if (roundingError > 0) {
      ROW[zone.bottom] += roundingError;
    }

    return { COL, ROW };
  }

  private getFullHeaderDimensions(): ShittyRendererParams["headerDimensions"] {
    const { height, width } = this.canvasRef.el!.getBoundingClientRect();

    const zone = this.figureViewport.zone;
    const { numberOfCols, numberOfRows } = zoneToDimension(zone);

    const colsWithDefinedWidth = Object.values(this.state.partialHeaderDimensions.COL).filter(
      isDefined
    );
    const availableWidth = width - colsWithDefinedWidth.reduce((acc, val) => acc + val, 0);
    const colsWithAutoWidth = numberOfCols - colsWithDefinedWidth.length;
    const baseWidth = Math.round(availableWidth / colsWithAutoWidth);

    const COL = {};
    let currentX = 0;
    for (let col = zone.left; col < zone.right; col++) {
      COL[col] = this.state.partialHeaderDimensions.COL[col] ?? baseWidth;
      currentX += COL[col];
    }
    COL[zone.right] = width - currentX; // to counteract rounding errors

    const rowsWithDefinedHeight = Object.values(this.state.partialHeaderDimensions.ROW).filter(
      isDefined
    );
    const availableHeight = height - rowsWithDefinedHeight.reduce((acc, val) => acc + val, 0);
    const rowsWithAutoHeight = numberOfRows - rowsWithDefinedHeight.length;
    const baseHeight = Math.round(availableHeight / rowsWithAutoHeight);

    const ROW = {};
    let currentY = 0;
    for (let row = zone.top; row < zone.bottom; row++) {
      ROW[row] = this.state.partialHeaderDimensions.ROW[row] ?? baseHeight;
      currentY += ROW[row];
    }
    ROW[zone.bottom] = height - currentY; // to counteract rounding errors

    return { COL, ROW };
  }

  get figureViewport() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getFigureViewport(sheetId, this.props.figure.id);
  }

  get overLayStyle() {
    const cssProperties: CSSProperties = {};

    if (this.state.hoveredCol !== undefined || this.state.resizedCol) {
      cssProperties.cursor = "col-resize";
    } else if (this.state.hoveredRow !== undefined || this.state.resizedCol) {
      cssProperties.cursor = "row-resize";
    }

    return cssPropertiesToCss(cssProperties);
  }

  onMouseMove(ev: MouseEvent) {
    if (!this.figureViewport.areGridLinesVisible) {
      return;
    }
    const x = ev.offsetX;
    const y = ev.offsetY;

    this.state.hoveredCol = this.getHoveredCol(x, y);
    this.state.hoveredRow = this.getHoveredRow(x, y);
  }

  onDblClick(ev: MouseEvent) {
    const x = ev.offsetX;
    const y = ev.offsetY;

    const hoveredCol = this.getHoveredCol(x, y);
    const hoveredRow = this.getHoveredRow(x, y);

    if (
      hoveredCol !== undefined &&
      this.figureViewport.headerDimensions?.COL[hoveredCol] !== undefined
    ) {
      this.state.partialHeaderDimensions.COL[hoveredCol] = undefined;
      this.updateFigureHeaderDimensions();
    } else if (
      hoveredRow !== undefined &&
      this.figureViewport.headerDimensions?.ROW[hoveredRow] !== undefined
    ) {
      this.state.partialHeaderDimensions.ROW[hoveredRow] = undefined;
      this.updateFigureHeaderDimensions();
    }
  }

  onMouseDown(ev: MouseEvent) {
    if (this.state.hoveredCol === undefined && this.state.hoveredRow === undefined) {
      return;
    }
    if (this.state.hoveredCol !== undefined) {
      this.startResizeCol(ev);
      ev.stopPropagation();
    } else if (this.state.hoveredRow !== undefined) {
      this.startResizeRow(ev);
      ev.stopPropagation();
    }
  }

  private startResizeCol(ev: MouseEvent) {
    if (this.state.hoveredCol === undefined) {
      return;
    }
    const canvasBoundingRect = this.canvasRef.el!.getBoundingClientRect();

    const resizedCol = this.state.hoveredCol;
    this.state.resizedCol = resizedCol;
    const startX = ev.clientX - canvasBoundingRect.left;
    const startColSize = this.getFullHeaderDimensions().COL[resizedCol];
    const onMouseMove = (ev: MouseEvent) => {
      const x = ev.clientX - canvasBoundingRect.left;
      const delta = x - startX;
      const newColSize = clip(startColSize + delta, 10, this.props.figure.width - 10);
      this.state.partialHeaderDimensions.COL[resizedCol] = newColSize;
    };
    const onMouseUp = () => {
      this.updateFigureHeaderDimensions();
      this.state.resizedCol = undefined;
    };
    startDnd(onMouseMove, onMouseUp);
  }

  private startResizeRow(ev: MouseEvent) {
    if (this.state.hoveredRow === undefined) {
      return;
    }
    const canvasBoundingRect = this.canvasRef.el!.getBoundingClientRect();

    const resizedRow = this.state.hoveredRow;
    this.state.resizedRow = resizedRow;
    const startY = ev.clientY - canvasBoundingRect.top;
    const startRowSize = this.getFullHeaderDimensions().ROW[resizedRow];
    const onMouseMove = (ev: MouseEvent) => {
      const y = ev.clientY - canvasBoundingRect.top;
      const delta = y - startY;
      const newRowSize = clip(startRowSize + delta, 10, this.props.figure.height - 10);
      this.state.partialHeaderDimensions.ROW[resizedRow] = newRowSize;
    };
    const onMouseUp = () => {
      this.updateFigureHeaderDimensions();
      this.state.resizedRow = undefined;
    };

    startDnd(onMouseMove, onMouseUp);
  }

  get headerPositions() {
    const { COL, ROW } = this.getFullHeaderDimensions();

    const colPositions: Record<string, number> = {};
    let currentX = 0;
    for (const key in COL) {
      currentX += COL[key];
      colPositions[key] = currentX;
    }

    const rowPositions: Record<string, number> = {};
    let currentY = 0;
    for (const key in ROW) {
      currentY += ROW[key];
      rowPositions[key] = currentY;
    }

    return { COL: colPositions, ROW: rowPositions };
  }

  private getHoveredCol(mouseX: Pixel, mouseY: Pixel): number | undefined {
    const { COL } = this.headerPositions;

    for (const col in COL) {
      if (Math.abs(COL[col] - mouseX) < 5) {
        const colNumber = parseInt(col);
        return colNumber === this.figureViewport.zone.right ? undefined : colNumber;
      }
    }
    return undefined;
  }

  private getHoveredRow(mouseX: Pixel, mouseY: Pixel): number | undefined {
    const { ROW } = this.headerPositions;

    for (const row in ROW) {
      if (Math.abs(ROW[row] - mouseY) < 5) {
        const rowNumber = parseInt(row);
        return rowNumber === this.figureViewport.zone.bottom ? undefined : rowNumber;
      }
    }

    return undefined;
  }

  private updateFigureHeaderDimensions() {
    this.env.model.dispatch("UPDATE_FIGURE_VIEWPORT", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      figureId: this.props.figure.id,
      zone: this.figureViewport.zone,
      definition: { headerDimensions: this.state.partialHeaderDimensions },
    });
  }

  get highlightedBorderStyle() {
    const highLightedCol = this.state.hoveredCol ?? this.state.resizedCol;
    if (highLightedCol !== undefined) {
      return cssPropertiesToCss({
        left: `${this.headerPositions.COL[highLightedCol]}px`,
        top: "0",
        height: `${this.props.figure.height}px`,
        width: "1px",
        "margin-left": "-1px",
        "border-left": "2px solid",
        "border-color": this.state.resizedCol !== undefined ? SELECTION_BORDER_COLOR : GRAY_300,
        cursor: "col-resize",
      });
    }

    const highLightedRow = this.state.hoveredRow ?? this.state.resizedRow;
    if (highLightedRow !== undefined) {
      return cssPropertiesToCss({
        top: `${this.headerPositions.ROW[highLightedRow]}px`,
        left: "0",
        width: `${this.props.figure.width}px`,
        height: "1px",
        "margin-top": "-1px",
        "border-top": "2px solid",
        "border-color": this.state.resizedRow !== undefined ? SELECTION_BORDER_COLOR : GRAY_300,
        cursor: "row-resize",
      });
    }

    return cssPropertiesToCss({ display: "none" });
  }
}
