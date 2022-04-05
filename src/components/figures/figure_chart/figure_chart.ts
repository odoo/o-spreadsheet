import { Component, useRef, useState } from "@odoo/owl";
import { MENU_WIDTH } from "../../../constants";
import { MenuItemRegistry } from "../../../registries/index";
import { _lt } from "../../../translation";
import { DOMCoordinates, Figure, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { useAbsolutePosition } from "../../helpers/position_hook";
import { Menu, MenuState } from "../../menu/menu";
import { BasicChart } from "../chart/basic_chart";
import { ScorecardChart } from "../chart_scorecard/chart_scorecard";

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

type FigureChartType = "scorecard" | "basicChart" | undefined;

interface Props {
  figure: Figure;
  sidePanelIsOpen: boolean;
  onFigureDeleted: () => void;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartFigure";
  static components = { Menu, BasicChart, ScorecardChart };
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
      action: () => this.env.openSidePanel("ChartPanel", { figure: this.props.figure }),
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
          this.env.toggleSidePanel("ChartPanel", { figure: this.props.figure });
        }
        this.props.onFigureDeleted();
      },
    });
    registry.add("refresh", {
      name: _lt("Refresh"),
      sequence: 11,
      action: () => {
        this.env.model.dispatch("REFRESH_CHART", {
          id: this.props.figure.id,
        });
      },
    });
    return registry;
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
    this.menuState.menuItems = registry.getAll().filter((x) => x.isVisible(this.env));
    this.menuState.position = position;
  }

  get figureChartType(): FigureChartType {
    switch (this.env.model.getters.getChartType(this.props.figure.id)) {
      case "bar":
      case "line":
      case "pie":
        return "basicChart";
      case "scorecard":
        return "scorecard";
    }
    return undefined;
  }
}
