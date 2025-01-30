import { Component, useRef, useState } from "@odoo/owl";
import { deepEquals, removeIndexesFromArray } from "../../helpers";
import { CSSProperties, Figure, ResizeDirection, SpreadsheetChildEnv, UID } from "../../types";
import { FigureComponent } from "../figures/figure/figure";
import { css, cssPropertiesToCss } from "../helpers/css";
import { startDnd } from "../helpers/drag_and_drop";
import { dragFigureForMove, dragFigureForResize } from "../helpers/figure_drag_helper";

const GRID_CELL_HEIGHT = 50;

css/* scss */ `
  .figure-grid {
    grid-auto-rows: ${GRID_CELL_HEIGHT}px;
    grid-template-columns: repeat(12, 1fr);

    .o-container {
      z-index: 1;
    }

    .o_we_background_grid {
      padding: 0;

      .o_we_cell {
        fill: #fff;
        fill-opacity: 0.1;
        stroke: #000;
        stroke-opacity: 0.2;
        stroke-width: 1px;
        filter: drop-shadow(-1px -1px 0px rgba(255, 255, 255, 0.3));
      }

      &.o_we_grid_preview {
        pointer-events: none;

        .o_we_cell {
          animation: gridPreview 2s 0.5s;
        }
      }
    }
  }
`;

interface GridFigure {
  id: UID;
  tag: string;
  left: number;
  top: number;
  bottom: number;
  right: number;
}

interface Props {}

interface State {
  gridFigures: GridFigure[];
  draggedFigureId: UID | undefined;
}
export class FigureGrid extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FigureGrid";
  static props = {
    "*": Object,
  };
  static components = { FigureComponent };

  state = useState<State>({
    gridFigures: [],
    draggedFigureId: undefined,
  });

  gridRef = useRef<HTMLDivElement>("figureGrid");

  setup() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const figures = this.env.model.getters.getFigures(sheetId);

    const gridFigures: GridFigure[] = [];

    for (let i = 0; i < figures.length; i++) {
      const top = Math.floor(i / 3) * 4;
      const left = (i % 3) * 4;
      gridFigures.push({
        id: figures[i].id,
        tag: figures[i].tag,
        top,
        left,
        bottom: top + 4,
        right: left + 4,
      });
    }

    try {
      Object.assign(gridFigures[0], { left: 0, top: 0, right: 3, bottom: 4 });
      Object.assign(gridFigures[1], { left: 3, top: 0, right: 6, bottom: 4 });
      Object.assign(gridFigures[2], { left: 6, top: 0, right: 9, bottom: 4 });
      Object.assign(gridFigures[3], { left: 9, top: 0, right: 12, bottom: 4 });

      Object.assign(gridFigures[4], { left: 0, top: 4, right: 5, bottom: 9 });
      Object.assign(gridFigures[5], { left: 5, top: 4, right: 12, bottom: 10 });

      Object.assign(gridFigures[6], { left: 0, top: 10, right: 12, bottom: 16 });

      Object.assign(gridFigures[7], { left: 0, top: 16, right: 6, bottom: 24 });
      Object.assign(gridFigures[8], { left: 6, top: 16, right: 12, bottom: 24 });
    } catch (e) {}
    this.state.gridFigures = gridFigures;
  }

  getFigure(gridFigure: GridFigure) {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const figure = this.env.model.getters.getFigure(sheetId, gridFigure.id);
    // // const rect = this.gridRef.el!.getBoundingClientRect(); ADRM TODO
    // const rect = { x: 0, y: 0, width: 1200, height: 800 };

    // const width = rect.width / 12;
    // const height = rect.height / 4;

    // return {
    //   ...figure,
    //   x: gridFigure.left * width,
    //   y: gridFigure.top * height,
    //   width: gridFigure.right - gridFigure.left * width,
    //   height: gridFigure.bottom - gridFigure.top * height,
    // };
    return { ...figure, x: 0, y: 0, width: 0, height: 0 };
  }

  gridFigureToFigure(gridFigure: GridFigure): Figure {
    const { width, height } = this.gridDimensions;
    return {
      id: gridFigure.id,
      tag: gridFigure.tag,
      x: gridFigure.left * width,
      y: gridFigure.top * height,
      width: (gridFigure.right - gridFigure.left) * width,
      height: (gridFigure.bottom - gridFigure.top) * height,
    };
  }

  figureToGridFigure(figure: Figure): GridFigure {
    const { width, height } = this.gridDimensions;
    return {
      id: figure.id,
      tag: figure.tag,
      left: Math.floor(figure.x / width),
      top: Math.floor(figure.y / height),
      right: Math.floor((figure.x + figure.width) / width),
      bottom: Math.floor((figure.y + figure.height) / height),
    };
  }

  startDraggingFigure(initialFigure: GridFigure, ev: MouseEvent) {
    if (ev.button > 0 || this.env.model.getters.isReadonly()) {
      // not main button, probably a context menu and no d&d in readonly mode
      return;
    }
    const selectResult = this.env.model.dispatch("SELECT_FIGURE", { id: initialFigure.id });
    if (!selectResult.isSuccessful) {
      return;
    }

    const rect = this.gridRef.el!.getBoundingClientRect();

    const initialMousePosition = { x: ev.clientX, y: ev.clientY };

    const maxDimensions = {
      maxX: rect.right,
      maxY: 999999999999999,
    };

    const onMouseMove = (ev: MouseEvent) => {
      let figures = [...this.state.gridFigures];
      const index = figures.findIndex((f) => f.id === initialFigure.id);
      if (index !== -1) {
        figures = removeIndexesFromArray(figures, [index]);
        figures.push(initialFigure);
        this.state.gridFigures = figures;
      }

      const getters = this.env.model.getters;
      this.state.draggedFigureId = initialFigure.id;
      const currentMousePosition = { x: ev.clientX, y: ev.clientY };
      const draggedFigure = dragFigureForMove(
        currentMousePosition,
        initialMousePosition,
        this.gridFigureToFigure(initialFigure),
        { x: 0, y: 0 },
        maxDimensions,
        getters.getActiveSheetScrollInfo() // ADRM TODO: this is wrong
      );

      const newGridFigure = this.figureToGridFigure(draggedFigure);
      if (!deepEquals(newGridFigure, initialFigure)) {
        const index = this.state.gridFigures.findIndex((f) => f.id === initialFigure.id);
        this.state.gridFigures[index] = newGridFigure;
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.state.draggedFigureId = undefined;
    };
    startDnd(onMouseMove, onMouseUp);
  }

  startResize(
    initialFigure: GridFigure,
    dirX: ResizeDirection,
    dirY: ResizeDirection,
    ev: MouseEvent
  ) {
    ev.stopPropagation();
    const initialMousePosition = { x: ev.clientX, y: ev.clientY };

    const keepRatio = false;
    const minFigSize = GRID_CELL_HEIGHT;

    const onMouseMove = (ev: MouseEvent) => {
      this.state.draggedFigureId = initialFigure.id;
      let figures = [...this.state.gridFigures];
      const index = figures.findIndex((f) => f.id === initialFigure.id);
      if (index !== -1) {
        figures = removeIndexesFromArray(figures, [index]);
        figures.push(initialFigure);
        this.state.gridFigures = figures;
      }

      const currentMousePosition = { x: ev.clientX, y: ev.clientY };
      const draggedFigure = dragFigureForResize(
        this.gridFigureToFigure(initialFigure),
        dirX,
        dirY,
        currentMousePosition,
        initialMousePosition,
        keepRatio,
        minFigSize,
        this.env.model.getters.getActiveSheetScrollInfo() // ADRM TODO
      );
      const newGridFigure = this.figureToGridFigure(draggedFigure);
      if (!deepEquals(newGridFigure, initialFigure)) {
        const index = this.state.gridFigures.findIndex((f) => f.id === initialFigure.id);
        this.state.gridFigures[index] = newGridFigure;
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.state.draggedFigureId = undefined;
    };
    startDnd(onMouseMove, onMouseUp);
  }

  getFigureWrapperStyle(gridFigure: GridFigure) {
    const cssProperties: CSSProperties = {
      "grid-area": `${gridFigure.top + 1} / ${gridFigure.left + 1} / ${gridFigure.bottom + 1} / ${
        gridFigure.right + 1
      }`,
    };

    return cssPropertiesToCss(cssProperties);
  }

  getFigureStyle(gridFigure: GridFigure) {
    const cssProperties: CSSProperties = {
      // position: "static",
    };
    return cssPropertiesToCss(cssProperties);
  }

  get gridDimensions() {
    if (!this.gridRef.el) {
      throw new Error("gridRef is not defiend yet");
    }
    return {
      width: this.gridRef.el.clientWidth / 12,
      height: GRID_CELL_HEIGHT,
    };
  }
}
