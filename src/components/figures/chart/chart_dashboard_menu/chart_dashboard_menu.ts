import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { BACKGROUND_CHART_COLOR } from "../../../../constants";
import { isDefined } from "../../../../helpers";
import { Store, useLocalStore, useStore } from "../../../../store_engine";
import { _t } from "../../../../translation";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { FullScreenChartStore } from "../../../full_screen_chart/full_screen_chart_store";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { ChartDashboardMenuStore } from "./chart_dashboard_menu_store";

interface Props {
  chartId: UID;
}

interface MenuItem {
  id: string;
  label: string;
  iconClass: string;
  onClick: () => void;
  isSelected?: boolean;
}

export class ChartDashboardMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartDashboardMenu";
  static components = { MenuPopover };
  static props = { chartId: String };

  private fullScreenFigureStore!: Store<FullScreenChartStore>;
  private store!: Store<ChartDashboardMenuStore>;

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });
  setup() {
    super.setup();
    this.store = useLocalStore(ChartDashboardMenuStore, this.props.chartId);
    this.fullScreenFigureStore = useStore(FullScreenChartStore);

    onWillUpdateProps(({ chartId }: Props) => {
      if (chartId !== this.props.chartId) {
        this.store.reset(chartId);
      }
    });
  }

  getMenuItems(): MenuItem[] {
    return [this.fullScreenMenuItem, ...this.store.changeChartTypeMenuItems].filter(isDefined);
  }

  get backgroundColor() {
    const color = this.env.model.getters.getChartDefinition(this.props.chartId).background;
    return "background-color: " + (color || BACKGROUND_CHART_COLOR);
  }

  openContextMenu(ev: MouseEvent) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = { x: ev.clientX, y: ev.clientY, width: 0, height: 0 };
    const figureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
    this.menuState.menuItems = getChartMenuActions(figureId, () => {}, this.env);
  }

  get fullScreenMenuItem(): MenuItem | undefined {
    const definition = this.env.model.getters.getChartDefinition(this.props.chartId);
    const figureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
    if (definition.type === "scorecard") {
      return undefined;
    }

    if (this.props.chartId === this.fullScreenFigureStore.fullScreenFigure?.id) {
      return {
        id: "fullScreenChart",
        label: _t("Exit Full Screen"),
        iconClass: "fa fa-compress",
        onClick: () => {
          this.fullScreenFigureStore.toggleFullScreenChart(figureId);
        },
      };
    }
    return {
      id: "fullScreenChart",
      label: _t("Full Screen"),
      iconClass: "fa fa-expand",
      onClick: () => {
        this.fullScreenFigureStore.toggleFullScreenChart(figureId);
      },
    };
  }
}
