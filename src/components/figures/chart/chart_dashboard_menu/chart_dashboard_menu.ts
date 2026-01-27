import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { isDefined } from "../../../../helpers";
import { Store, useStore } from "../../../../store_engine";
import { Rect, UID } from "../../../../types";
import { FullScreenFigureStore } from "../../../full_screen_figure/full_screen_figure_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { InfoPopover } from "../../../info_popover/info_popover";
import { MenuPopover } from "../../../menu_popover/menu_popover";

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

interface ChartMenuState {
  isOpen: boolean;
  openedPopover?: "menu" | "info";
  anchorRect: null | Rect;
  menuItems: Action[];
}

export class ChartDashboardMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartDashboardMenu";
  static components = { MenuPopover, InfoPopover };
  static props = { chartId: String, hasFullScreenButton: { type: Boolean, optional: true } };
  static defaultProps = { hasFullScreenButton: true };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  private state: ChartMenuState = useState({
    isOpen: false,
    openedPopover: undefined,
    anchorRect: null,
    menuItems: [],
  });

  setup() {
    super.setup();
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);
  }

  getMenuItems(): MenuItem[] {
    return [this.fullScreenMenuItem].filter(isDefined);
  }

  get chartDefinition() {
    return this.env.model.getters.getChartDefinition(this.props.chartId);
  }

  get backgroundColor() {
    const color = this.chartDefinition.background;
    return "background-color: " + (color || BACKGROUND_CHART_COLOR);
  }

  openContextMenu(ev: MouseEvent) {
    this.state.isOpen = true;
    this.state.openedPopover = "menu";
    this.state.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
    const figureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
    this.state.menuItems = getChartMenuActions(figureId, this.env);
  }

  showInfo(ev: MouseEvent) {
    this.state.isOpen = true;
    this.state.openedPopover = "info";
    this.state.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
  }

  getAnnotationText() {
    return this.chartDefinition.annotationText;
  }

  getAnnotationLink() {
    return this.chartDefinition.annotationLink;
  }

  get fullScreenMenuItem(): MenuItem | undefined {
    if (!this.props.hasFullScreenButton) {
      return undefined;
    }
    const figureId = this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
    if (this.chartDefinition.type === "scorecard") {
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
