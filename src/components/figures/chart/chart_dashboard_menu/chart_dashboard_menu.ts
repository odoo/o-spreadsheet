import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { BACKGROUND_CHART_COLOR } from "../../../../constants";
import { isDefined } from "../../../../helpers";
import { chartRegistry, chartSubtypeRegistry } from "../../../../registries/chart_types";
import { Store, useStore } from "../../../../store_engine";
import { _t } from "../../../../translation";
import { ChartDefinition, ChartType, FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { FullScreenChartStore } from "../../../full_screen_chart/full_screen_chart_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";

interface Props {
  figureUI: FigureUI;
}

interface MenuItem {
  id: string;
  label: string;
  iconClass: string;
  onClick: () => void;
  isSelected?: boolean;
}

export class ChartDashboardMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "spreadsheet.ChartDashboardMenu";
  static components = { MenuPopover };
  static props = { figureUI: Object };

  private originalChartDefinition!: ChartDefinition;
  private fullScreenFigureStore!: Store<FullScreenChartStore>;

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });

  setup() {
    super.setup();
    this.fullScreenFigureStore = useStore(FullScreenChartStore);
    this.originalChartDefinition = this.env.model.getters.getChartDefinition(
      this.props.figureUI.id
    );
    onWillUpdateProps(({ figureUI }: Props) => {
      if (figureUI.id !== this.props.figureUI.id) {
        this.originalChartDefinition = this.env.model.getters.getChartDefinition(figureUI.id);
      }
    });
  }

  getMenuItems(): MenuItem[] {
    return [this.fullScreenMenuItem, ...this.changeChartTypeMenuItems].filter(isDefined);
  }

  get changeChartTypeMenuItems(): MenuItem[] {
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    if (!["line", "bar", "pie"].includes(definition.type)) {
      return [];
    }

    return ["column", "line", "pie"].map((type) => {
      const item = chartSubtypeRegistry.get(type);
      return {
        id: item.chartType,
        label: item.displayName,
        onClick: () => this.onTypeChange(item.chartType),
        isSelected: item.chartType === this.selectedChartType,
        iconClass: this.getIconClasses(item.chartType),
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
    this.menuState.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
    this.menuState.menuItems = getChartMenuActions(this.props.figureUI.id, this.env);
  }

  get fullScreenMenuItem(): MenuItem | undefined {
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    if (definition.type === "scorecard") {
      return undefined;
    }

    if (this.props.figureUI.id === this.fullScreenFigureStore.fullScreenFigure?.id) {
      return {
        id: "fullScreenChart",
        label: _t("Exit Full Screen"),
        iconClass: "fa fa-compress",
        onClick: () => {
          this.fullScreenFigureStore.toggleFullScreenChart(this.props.figureUI.id);
        },
      };
    }
    return {
      id: "fullScreenChart",
      label: _t("Full Screen"),
      iconClass: "fa fa-expand",
      onClick: () => {
        this.fullScreenFigureStore.toggleFullScreenChart(this.props.figureUI.id);
      },
    };
  }
}
