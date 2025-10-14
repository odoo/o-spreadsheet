import { Component, useState } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { BACKGROUND_CHART_COLOR } from "../../../../constants";
import { isDefined } from "../../../../helpers";
import { Store, useStore } from "../../../../store_engine";
import { _t } from "../../../../translation";
import { SpreadsheetChildEnv, UID } from "../../../../types";
import { FullScreenFigureStore } from "../../../full_screen_figure/full_screen_figure_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";

interface Props {
  chartId: UID;
  hasFullScreenButton: boolean;
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
  static props = { chartId: String, hasFullScreenButton: { type: Boolean, optional: true } };
  static defaultProps = { hasFullScreenButton: true };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  private menuState: MenuState = useState({ isOpen: false, anchorRect: null, menuItems: [] });
  setup() {
    super.setup();
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);
  }

  getMenuItems(): MenuItem[] {
    return [this.fullScreenMenuItem].filter(isDefined);
  }

  get backgroundColor() {
    const color = this.env.model.getters.getChartDefinition(this.props.chartId).background;
    return "background-color: " + (color || BACKGROUND_CHART_COLOR);
  }

  openContextMenu(ev: MouseEvent) {
    this.menuState.isOpen = true;
    this.menuState.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
    const figureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
    this.menuState.menuItems = getChartMenuActions(figureId, this.env);
  }

  get fullScreenMenuItem(): MenuItem | undefined {
    if (!this.props.hasFullScreenButton) {
      return undefined;
    }
    const definition = this.env.model.getters.getChartDefinition(this.props.chartId);
    const figureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
    if (definition.type === "scorecard") {
      return undefined;
    }
    const isFullScreen = figureId === this.fullScreenFigureStore.fullScreenFigure?.id;
    return {
      id: "fullScreenChart",
      label: isFullScreen ? _t("Exit Full Screen") : _t("Full Screen"),
      class: `text-muted fa ${isFullScreen ? "fa-compress" : "fa-expand"}`,
      onClick: () => {
        this.fullScreenFigureStore.toggleFullScreenFigure(figureId);
      },
    };
  }
}
