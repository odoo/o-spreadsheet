import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { BACKGROUND_CHART_COLOR } from "../../../../constants";
import { chartRegistry, chartSubtypeRegistry } from "../../../../registries/chart_types";
import { ChartDefinition, ChartType, FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { Menu, MenuState } from "../../../menu/menu";

interface Props {
  figureUI: FigureUI;
}

export class ChartDashboardMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "spreadsheet.ChartDashboardMenu";
  static components = { Menu };
  static props = { figureUI: Object };

  private originalChartDefinition!: ChartDefinition;

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

  setup() {
    super.setup();
    this.originalChartDefinition = this.env.model.getters.getChartDefinition(
      this.props.figureUI.id
    );
    onWillUpdateProps(({ figureUI }: Props) => {
      if (figureUI.id !== this.props.figureUI.id) {
        this.originalChartDefinition = this.env.model.getters.getChartDefinition(figureUI.id);
      }
    });
  }

  getAvailableTypes() {
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    if (!["line", "bar", "pie"].includes(definition.type)) {
      return [];
    }

    return ["column", "line", "pie"].map((type) => {
      const item = chartSubtypeRegistry.get(type);
      return {
        ...item,
        icon: this.getIconClasses(item.chartType),
      };
    });
  }

  getIconClasses(type: ChartType) {
    if (type.includes("bar")) {
      return "fa fa-bar-chart";
    }
    if (type.includes("line")) {
      return "fa fa-line-chart";
    }
    if (type.includes("pie")) {
      return "fa fa-pie-chart";
    }
    return "";
  }

  onTypeChange(type: ChartType) {
    const figureId = this.props.figureUI.id;
    const currentDefinition = this.env.model.getters.getChartDefinition(figureId);
    if (currentDefinition.type === type) {
      return;
    }

    let definition: ChartDefinition;
    if (this.originalChartDefinition.type === type) {
      definition = this.originalChartDefinition;
    } else {
      const newChartInfo = chartSubtypeRegistry.get(type);
      const ChartClass = chartRegistry.get(newChartInfo.chartType);
      const chartCreationContext = this.env.model.getters.getContextCreationChart(figureId);
      if (!chartCreationContext) return;
      definition = {
        ...ChartClass.getChartDefinitionFromContextCreation(chartCreationContext),
        ...newChartInfo.subtypeDefinition,
      } as ChartDefinition;
    }

    this.env.model.dispatch("UPDATE_CHART", {
      definition,
      figureId,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }

  get selectedChartType() {
    return this.env.model.getters.getChartDefinition(this.props.figureUI.id).type;
  }

  get backgroundColor() {
    const color = this.env.model.getters.getChartDefinition(this.props.figureUI.id).background;
    return "background-color: " + (color || BACKGROUND_CHART_COLOR);
  }

  openContextMenu(ev: MouseEvent) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = { x: ev.clientX, y: ev.clientY, width: 0, height: 0 };
    this.menuState.menuItems = getChartMenuActions(this.props.figureUI.id, () => {}, this.env);
  }
}
