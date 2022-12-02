import { Component, onMounted } from "@odoo/owl";
import { figureRegistry } from "../../../registries/index";
import { Figure, SpreadsheetChildEnv } from "../../../types/index";
import { css } from "../../helpers";
import { FigureComponent } from "../figure/figure";
import { ChartFigure } from "../figure_chart/figure_chart";

interface Props {
  sidePanelIsOpen: Boolean;
  onFigureDeleted: () => void;
}

type VisibleFigureGroups = {
  topLeft: Figure[];
  topRight: Figure[];
  bottomLeft: Figure[];
  bottomRight: Figure[];
};

css/* scss */ `
  .figure-anchor {
    width: 0px;
    height: 0px;
    position: absolute;
  }
`;
export class FiguresContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FiguresContainer";
  static components = { FigureComponent };

  getVisibleFigureGroups(): VisibleFigureGroups {
    const figures = this.env.model.getters.getVisibleFigures();
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();
    const figureGroups: VisibleFigureGroups = {
      topLeft: [],
      topRight: [],
      bottomLeft: [],
      bottomRight: [],
    };
    figures.forEach((figure) => {
      if (figure.x < x && figure.y < y) {
        figureGroups.topLeft.push(figure);
      } else if (figure.y < y) {
        figureGroups.topRight.push(figure);
      } else if (figure.x < x) {
        figureGroups.bottomLeft.push(figure);
      } else {
        figureGroups.bottomRight.push(figure);
      }
    });
    return figureGroups;
  }

  // Top left
  get topLeftAnchorStyle() {
    return `
      x: 0px;
      y: 0px;
    `;
  }

  get topLeftWrapperStyle() {
    const { width, height } = this.env.model.getters.getSheetViewDimension();
    return `
      x: 0px;
      y: 0px;
      width: ${width}px;
      height: ${height}px;
    `;
  }

  // top right
  get topRightAnchorStyle() {
    const { x } = this.env.model.getters.getMainViewportCoordinates();
    const { offsetX } = this.env.model.getters.getActiveSheetScrollInfo();
    return `
      x: ${-(x + offsetX)}px;
      y: 0px;
    `;
  }
  get topRightWrapperStyle() {
    const { x } = this.env.model.getters.getMainViewportCoordinates();
    const { width, height } = this.env.model.getters.getSheetViewDimension();
    return `
      x: ${x}px;
      y: 0px;
      width: ${width - x}px;
      height: ${height}px;
    `;
  }

  // bottom left
  get bottomLeftAnchorStyle() {
    const { y } = this.env.model.getters.getMainViewportCoordinates();
    const { offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    return `
      x: 0px;
      y: ${-(y + offsetY)}px;
    `;
  }
  get bottomLeftWrapperStyle() {
    const { y } = this.env.model.getters.getMainViewportCoordinates();
    const { height, width } = this.env.model.getters.getSheetViewDimension();
    return `
      x: 0px;
      y: ${y}px;
      width: ${width}px;
      height: ${height - y}px;
    `;
  }

  // bottom right
  get bottomRightAnchorStyle() {
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    return `
      x: ${-(x + offsetX)}px;
      y: ${-(y + offsetY)}px;
    `;
  }

  get bottomRightWrapperStyle() {
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();
    const { width, height } = this.env.model.getters.getSheetViewDimension();
    return `
      x: ${x}px;
      y: ${y}px;
      width: ${width - x}px;
      height: ${height - y}px;
      background-color:#00000080;
    `;
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
}

FiguresContainer.props = {
  sidePanelIsOpen: Boolean,
  onFigureDeleted: Function,
};

figureRegistry.add("chart", { Component: ChartFigure, SidePanelComponent: "ChartPanel" });
