import { Component, useRef, useState } from "@odoo/owl";
import { MENU_WIDTH } from "../../../constants";
import { chartComponentRegistry } from "../../../registries/chart_types";
import { MenuItemRegistry } from "../../../registries/index";
import { _lt } from "../../../translation";
import { ChartType, DOMCoordinates, Figure, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { useAbsolutePosition } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";

// -----------------------------------------------------------------------------
// STYLE
// -----------------------------------------------------------------------------
css/* scss */ `
  .o-chart-container {
    width: 100%;
    height: 100%;
    position: relative;

    .o-chart-menu {
      right: 0px;
      display: none;
      position: absolute;
      padding: 5px;
    }

    .o-chart-menu-item {
      cursor: pointer;
    }
  }
  .o-figure.active:focus,
  .o-figure:hover {
    .o-chart-container {
      .o-chart-menu {
        display: flex;
      }
    }
  }
`;

interface Props {
  // props figure is necessary scorecards, we need the chart dimension at render to avoid having to force the
  // style by hand in the useEffect()
  figure: Figure;
  sidePanelIsOpen: boolean;
  onFigureDeleted: () => void;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static components = { Menu };
  private menuState: MenuState = useState({ isOpen: false, position: null, menuItems: [] });

  private chartContainerRef = useRef("chartContainer");
  private menuButtonRef = useRef("menuButton");
  private menuButtonPosition = useAbsolutePosition(this.menuButtonRef);
  private position = useAbsolutePosition(this.chartContainerRef);

  private getMenuItemRegistry(): MenuItemRegistry {
    const registry = new MenuItemRegistry();
    registry.add("edit", {
      name: _lt("Edit"),
      sequence: 1,
      action: () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.props.figure.id });
        this.env.openSidePanel("ChartPanel");
      },
    });
    registry.add("copy", {
      name: _lt("Copy"),
      sequence: 2,
      action: async () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.props.figure.id });
        this.env.model.dispatch("COPY");
        await this.env.clipboard.writeText(this.env.model.getters.getClipboardContent());
      },
    });
    registry.add("cut", {
      name: _lt("Cut"),
      sequence: 3,
      action: async () => {
        this.env.model.dispatch("SELECT_FIGURE", { id: this.props.figure.id });
        this.env.model.dispatch("CUT");
        await this.env.clipboard.writeText(this.env.model.getters.getClipboardContent());
      },
    });
    registry.add("delete", {
      name: _lt("Delete"),
      sequence: 10,
      action: () => {
        this.env.model.dispatch("DELETE_FIGURE", {
          sheetId: this.env.model.getters.getActiveSheetId(),
          id: this.props.figure.id,
        });
        if (this.props.sidePanelIsOpen) {
          this.env.toggleSidePanel("ChartPanel");
        }
        this.props.onFigureDeleted();
      },
    });
    return registry;
  }

  get chartType(): ChartType {
    return this.env.model.getters.getChartType(this.props.figure.id);
  }

  onContextMenu(ev: MouseEvent) {
    const position = {
      x: this.position.x + ev.offsetX,
      y: this.position.y + ev.offsetY,
    };
    this.openContextMenu(position);
  }

  showMenu() {
    const position = {
      x: this.menuButtonPosition.x - MENU_WIDTH,
      y: this.menuButtonPosition.y,
    };
    this.openContextMenu(position);
  }

  private openContextMenu(position: DOMCoordinates) {
    const registry = this.getMenuItemRegistry();
    this.menuState.isOpen = true;
    this.menuState.menuItems = registry.getAll();
    this.menuState.position = position;
  }

  get chartComponent(): new (...args: any) => Component {
    const type = this.chartType;
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }
}
