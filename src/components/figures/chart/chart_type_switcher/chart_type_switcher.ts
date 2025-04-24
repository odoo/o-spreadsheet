import { Component } from "@odoo/owl";
import { BACKGROUND_CHART_COLOR } from "../../../../constants";
import { chartRegistry, chartSubtypeRegistry } from "../../../../registries";
import { ChartDefinition, ChartType, FigureUI, Rect, SpreadsheetChildEnv } from "../../../../types";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";

const lineBarPieRegex = /line|bar|pie/;

interface Props {
  figureUI: FigureUI;
  openContextMenu: (rect: Rect) => void;
}

export class ChartTypeSwitcherMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "spreadsheet.ChartTypeSwitcherMenu";
  static components = {};
  static props = { figureUI: Object, openContextMenu: Function };

  private originalChartDefinition!: ChartDefinition;

  setup() {
    super.setup();
    this.originalChartDefinition = this.env.model.getters.getChartDefinition(
      this.props.figureUI.id
    );
  }

  get shouldBeDisplayed() {
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    if (!lineBarPieRegex.test(definition.type)) {
      return false;
    }
    return true;
  }

  get availableTypes() {
    const types = ["column", "line", "pie"];
    return types.map((type) => {
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
    this.props.openContextMenu(getBoundingRectAsPOJO(ev.target as HTMLElement));
  }
}
