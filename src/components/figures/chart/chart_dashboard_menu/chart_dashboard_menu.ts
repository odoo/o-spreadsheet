import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { isDefined } from "../../../../helpers";
import { Store, useLocalStore, useStore } from "../../../../store_engine";
import { _t } from "../../../../translation";
import { FigureUI, SpreadsheetChildEnv } from "../../../../types";
import { FullScreenChartStore } from "../../../full_screen_chart/full_screen_chart_store";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { ChartDashboardMenuStore } from "./chart_dashboard_menu_store";

interface Props {
  figureUI: FigureUI;
}

interface MenuItem {
  id: string;
  label: string;
  class: string;
  onClick: () => void;
  preview?: string;
}

export class ChartDashboardMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartDashboardMenu";
  static components = { MenuPopover };
  static props = { figureUI: Object };

  private fullScreenFigureStore!: Store<FullScreenChartStore>;
  private store!: Store<ChartDashboardMenuStore>;

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });
  setup() {
    super.setup();
    this.store = useLocalStore(ChartDashboardMenuStore, this.props.figureUI.id);
    this.fullScreenFigureStore = useStore(FullScreenChartStore);

    onWillUpdateProps(({ figureUI }: Props) => {
      if (figureUI.id !== this.props.figureUI.id) {
        this.store.reset(figureUI.id);
      }
    });
  }

  getMenuItems(): MenuItem[] {
    return [this.fullScreenMenuItem, ...this.store.changeChartTypeMenuItems].filter(isDefined);
  }

  openContextMenu(ev: MouseEvent) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = { x: ev.clientX, y: ev.clientY, width: 0, height: 0 };
    this.menuState.menuItems = getChartMenuActions(this.props.figureUI.id, () => {}, this.env);
  }

  get fullScreenMenuItem(): MenuItem | undefined {
    const definition = this.env.model.getters.getChartDefinition(this.props.figureUI.id);
    if (definition.type === "scorecard") {
      return undefined;
    }
    const isFullScreen = this.props.figureUI.id === this.fullScreenFigureStore.fullScreenFigure?.id;
    return {
      id: "fullScreenChart",
      label: _t(isFullScreen ? "Exit Full Screen" : "Full Screen"),
      class: `text-muted fa ${isFullScreen ? "fa-compress" : "fa-expand"}`,
      onClick: () => {
        this.fullScreenFigureStore.toggleFullScreenChart(this.props.figureUI.id);
      },
    };
  }
}
