import { Component, onMounted, useState, xml } from "@odoo/owl";
import { HEADER_HEIGHT, HEADER_WIDTH, SELECTION_BORDER_COLOR } from "../../constants";
import { figureRegistry } from "../../registries/index";
import { Figure, SpreadsheetChildEnv } from "../../types/index";
import { css } from "../helpers/css";
import { startDnd } from "../helpers/drag_and_drop";
import { ChartFigure } from "./chart";

interface FigureInfo {
  id: string;
  isSelected: boolean;
  figure: Figure;
}

const TEMPLATE = xml/* xml */ `<div>
    <t t-foreach="getVisibleFigures()" t-as="info" t-key="info.id">
        <div class="o-figure-wrapper"
             t-att-style="getStyle(info)"
             t-on-mousedown="(ev) => this.onMouseDown(info.figure, ev)"
             >
            <div class="o-figure"
                 t-att-class="{active: info.isSelected, 'o-dragging': info.id === dnd.figureId}"
                 t-att-style="getDims(info)"
                 tabindex="0"
                 t-on-keydown.stop="(ev) => this.onKeyDown(info.figure, ev)"
                 t-on-keyup.stop="">
                <t t-component="figureRegistry.get(info.figure.tag).Component"
                   t-key="info.id"
                   sidePanelIsOpen="props.sidePanelIsOpen"
                   onFigureDeleted="props.onFigureDeleted"
                   figure="info.figure"/>
                <t t-if="info.isSelected">
                    <div class="o-anchor o-top" t-on-mousedown.stop="(ev) => this.resize(info.figure, 0,-1, ev)"/>
                    <div class="o-anchor o-topRight" t-on-mousedown.stop="(ev) => this.resize(info.figure, 1,-1, ev)"/>
                    <div class="o-anchor o-right" t-on-mousedown.stop="(ev) => this.resize(info.figure, 1,0, ev)"/>
                    <div class="o-anchor o-bottomRight" t-on-mousedown.stop="(ev) => this.resize(info.figure, 1,1, ev)"/>
                    <div class="o-anchor o-bottom" t-on-mousedown.stop="(ev) => this.resize(info.figure, 0,1, ev)"/>
                    <div class="o-anchor o-bottomLeft" t-on-mousedown.stop="(ev) => this.resize(info.figure, -1,1, ev)"/>
                    <div class="o-anchor o-left" t-on-mousedown.stop="(ev) => this.resize(info.figure, -1,0, ev)"/>
                    <div class="o-anchor o-topLeft" t-on-mousedown.stop="(ev) => this.resize(info.figure, -1,-1, ev)"/>
                </t>
            </div>
        </div>
    </t>
</div>
`;

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
const ANCHOR_SIZE = 8;
const BORDER_WIDTH = 1;
const ACTIVE_BORDER_WIDTH = 2;
const MIN_FIG_SIZE = 80;

css/*SCSS*/ `
  .o-figure-wrapper {
    overflow: hidden;
  }

  div.o-figure {
    border: 1px solid black;
    box-sizing: border-box;
    position: absolute;
    bottom: 3px;
    right: 3px;
    &:focus {
      outline: none;
    }
    &.active {
      border: ${ACTIVE_BORDER_WIDTH}px solid ${SELECTION_BORDER_COLOR};
      z-index: 1;
    }

    &.o-dragging {
      opacity: 0.9;
      cursor: grabbing;
    }

    .o-anchor {
      z-index: 1000;
      position: absolute;
      outline: ${BORDER_WIDTH}px solid white;
      width: ${ANCHOR_SIZE}px;
      height: ${ANCHOR_SIZE}px;
      background-color: #1a73e8;
      &.o-top {
        top: -${ANCHOR_SIZE / 2}px;
        right: calc(50% - 4px);
        cursor: n-resize;
      }
      &.o-topRight {
        top: -${ANCHOR_SIZE / 2}px;
        right: -${ANCHOR_SIZE / 2}px;
        cursor: ne-resize;
      }
      &.o-right {
        right: -${ANCHOR_SIZE / 2}px;
        top: calc(50% - 4px);
        cursor: e-resize;
      }
      &.o-bottomRight {
        bottom: -${ANCHOR_SIZE / 2}px;
        right: -${ANCHOR_SIZE / 2}px;
        cursor: se-resize;
      }
      &.o-bottom {
        bottom: -${ANCHOR_SIZE / 2}px;
        right: calc(50% - 4px);
        cursor: s-resize;
      }
      &.o-bottomLeft {
        bottom: -${ANCHOR_SIZE / 2}px;
        left: -${ANCHOR_SIZE / 2}px;
        cursor: sw-resize;
      }
      &.o-left {
        bottom: calc(50% - 4px);
        left: -${ANCHOR_SIZE / 2}px;
        cursor: w-resize;
      }
      &.o-topLeft {
        top: -${ANCHOR_SIZE / 2}px;
        left: -${ANCHOR_SIZE / 2}px;
        cursor: nw-resize;
      }
    }
  }
`;

interface Props {
  sidePanelIsOpen: Boolean;
  onFigureDeleted: () => void;
}

export class FiguresContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = TEMPLATE;
  static components = {};
  figureRegistry = figureRegistry;

  dnd = useState({
    figureId: "",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  getVisibleFigures(): FigureInfo[] {
    const selectedId = this.env.model.getters.getSelectedFigureId();
    return this.env.model.getters.getVisibleFigures().map((f) => ({
      id: f.id,
      isSelected: f.id === selectedId,
      figure: f,
    }));
  }

  getDims(info: FigureInfo) {
    const { figure, isSelected } = info;
    const borders = 2 * (isSelected ? ACTIVE_BORDER_WIDTH : BORDER_WIDTH);
    const { width, height } = isSelected && this.dnd.figureId ? this.dnd : figure;
    return `width:${width + borders}px;height:${height + borders}px`;
  }

  getStyle(info: FigureInfo) {
    const { figure, isSelected } = info;
    const { offsetX, offsetY } = this.env.model.getters.getActiveViewport();
    const target = figure.id === (isSelected && this.dnd.figureId) ? this.dnd : figure;
    const { width, height } = target;
    let x = target.x - offsetX + HEADER_WIDTH - 1;
    let y = target.y - offsetY + HEADER_HEIGHT - 1;
    // width and height of wrapper need to be adjusted so we do not overlap
    // with headers
    const correctionX = Math.max(0, HEADER_WIDTH - x);
    x += correctionX;
    const correctionY = Math.max(0, HEADER_HEIGHT - y);
    y += correctionY;

    if (width < 0 || height < 0) {
      return `position:absolute;display:none;`;
    }
    const offset =
      ANCHOR_SIZE + ACTIVE_BORDER_WIDTH + (isSelected ? ACTIVE_BORDER_WIDTH : BORDER_WIDTH);
    return `position:absolute; top:${y + 1}px; left:${x + 1}px; width:${
      width - correctionX + offset
    }px; height:${height - correctionY + offset}px`;
  }

  setup() {
    onMounted(() => {
      // horrible, but necessary
      // the following line ensures that we render the figures with the correct
      // viewport.  The reason is that whenever we initialize the grid
      // component, we do not know yet the actual size of the viewport, so the
      // first owl rendering is done with an empty viewport.  Only then we can
      // compute which figures should be displayed, so we have to force a
      // new rendering
      this.render();
    });
  }

  resize(figure: Figure, dirX: number, dirY: number, ev: MouseEvent) {
    ev.stopPropagation();
    const initialX = ev.clientX;
    const initialY = ev.clientY;
    this.dnd.figureId = figure.id;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      const deltaX = dirX * (ev.clientX - initialX);
      const deltaY = dirY * (ev.clientY - initialY);
      this.dnd.width = Math.max(figure.width + deltaX, MIN_FIG_SIZE);
      this.dnd.height = Math.max(figure.height + deltaY, MIN_FIG_SIZE);
      if (dirX < 0) {
        this.dnd.x = figure.x - deltaX;
      }
      if (dirY < 0) {
        this.dnd.y = figure.y - deltaY;
      }
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dnd.figureId = "";
      const update: Partial<Figure> = {
        x: this.dnd.x,
        y: this.dnd.y,
      };
      if (dirX) {
        update.width = this.dnd.width;
      }
      if (dirY) {
        update.height = this.dnd.height;
      }
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        ...update,
      });
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onMouseDown(figure: Figure, ev: MouseEvent) {
    if (ev.button > 0) {
      // not main button, probably a context menu
      return;
    }
    this.env.model.dispatch("SELECT_FIGURE", { id: figure.id });
    if (this.props.sidePanelIsOpen) {
      this.env.openSidePanel("ChartPanel", { figure });
    }
    const initialX = ev.clientX;
    const initialY = ev.clientY;
    this.dnd.figureId = figure.id;
    this.dnd.x = figure.x;
    this.dnd.y = figure.y;
    this.dnd.width = figure.width;
    this.dnd.height = figure.height;

    const onMouseMove = (ev: MouseEvent) => {
      this.dnd.x = Math.max(figure.x - initialX + ev.clientX, 0);
      this.dnd.y = Math.max(figure.y - initialY + ev.clientY, 0);
    };
    const onMouseUp = (ev: MouseEvent) => {
      this.dnd.figureId = "";
      this.env.model.dispatch("UPDATE_FIGURE", {
        sheetId: this.env.model.getters.getActiveSheetId(),
        id: figure.id,
        x: this.dnd.x,
        y: this.dnd.y,
      });
    };
    startDnd(onMouseMove, onMouseUp);
  }

  onKeyDown(figure: Figure, ev: KeyboardEvent) {
    ev.preventDefault();
    switch (ev.key) {
      case "Delete":
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: figure.id,
        });
        this.props.onFigureDeleted();
        break;
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
        const deltaMap = {
          ArrowDown: [0, 1],
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
        };
        const delta = deltaMap[ev.key];
        this.env.model.dispatch("UPDATE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: figure.id,
          x: figure.x + delta[0],
          y: figure.y + delta[1],
        });
    }
  }
}

figureRegistry.add("chart", { Component: ChartFigure, SidePanelComponent: "ChartPanel" });
