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
    overflow: visible;
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
      left: 0px;
      top: 0px;
    `;
  }

  get topLeftWrapperStyle() {
    const { width, height } = this.env.model.getters.getMainViewportRect();
    return `
      left: 0px;
      top: 0px;
      width: ${width}px;
      height: ${height}px;
    `;
  }

  // top right
  get topRightAnchorStyle() {
    const { x } = this.env.model.getters.getMainViewportCoordinates();
    const { offsetX } = this.env.model.getters.getActiveSheetScrollInfo();
    return `
      left: ${-(x + offsetX)}px;
      top: 0px;
    `;
  }
  get topRightWrapperStyle() {
    const { x } = this.env.model.getters.getMainViewportCoordinates();
    const { width, height } = this.env.model.getters.getMainViewportRect();
    return `
      left: ${x}px;
      top: 0px;
      width: ${width - x}px;
      height: ${height}px;
    `;
  }

  // bottom left
  get bottomLeftAnchorStyle() {
    const { y } = this.env.model.getters.getMainViewportCoordinates();
    const { offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    return `
      left: 0px;
      top: ${-(y + offsetY)}px;
    `;
  }
  get bottomLeftWrapperStyle() {
    const { y } = this.env.model.getters.getMainViewportCoordinates();
    const { height, width } = this.env.model.getters.getMainViewportRect();
    return `
      left: 0px;
      top: ${y}px;
      width: ${width}px;
      height: ${height - y}px;
    `;
  }

  /**  TODORAR : etendre les dimensions des wrappers. Il semblerait que le fait de rajouter un element dans un
   * wrapper en position absolute force l'élement a étre visible. On a déja eu le coup dans le passé
   *  (voir https://github.com/odoo/o-spreadsheet/pull/1071/)
   * Donc une alternative a essayer c'est de faire un GROS wrapper de figure, qui sera lui meme coupé par le grid-overlay qui serait en overflow hidden
   *
   * Ceci étant dit, je dois essayer d'utiliser les portails. Donc a chaque rendu on dirait a un élément de se TP dans le bon wrapper.
   * SI les protails fonctionnent ça peut être pas mal, je sais aps ce qui serait le moins "hacky"
   */

  // bottom right
  get bottomRightAnchorStyle() {
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();
    const { offsetX, offsetY } = this.env.model.getters.getActiveSheetScrollInfo();
    return `
      left: ${-(x + offsetX)}px;
      top: ${-(y + offsetY)}px;
    `;
  }

  get bottomRightWrapperStyle() {
    const { x, y } = this.env.model.getters.getMainViewportCoordinates();
    const { width, height } = this.env.model.getters.getMainViewportRect();
    return `
      left: ${x}px;
      top: ${y}px;
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
