import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { GeoChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { Store, useStore } from "../../../../store_engine";
import { Rect, UID, ValueAndLabel } from "../../../../types";
import { FullScreenFigureStore } from "../../../full_screen_figure/full_screen_figure_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover } from "../../../menu_popover/menu_popover";
import { Select } from "../../../select/select";
import { InfoPopover } from "../../../info_popover/info_popover";

interface Props {
  chartId: UID;
  hasFullScreenButton: boolean;
  displayEllipsis: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onClick: (ev: MouseEvent) => void;
}

interface ChartMenuState {
  openedPopover?: "menu" | "info";
  anchorRect: null | Rect;
  menuItems: Action[];
}

export class ChartMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartMenu";
  static components = { MenuPopover, InfoPopover, Select};
  static props = {
    chartId: String,
    hasFullScreenButton: { type: Boolean, optional: true },
    displayEllipsis: { type: Boolean, optional: true },
  };
  static defaultProps = { hasFullScreenButton: true, displayEllipsis: true };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  private state: ChartMenuState = useState({
    openedPopover: undefined,
    anchorRect: null,
    menuItems: [],
  });

  setup() {
    super.setup();
    this.fullScreenFigureStore = useStore(FullScreenFigureStore);
  }

  getMenuItems(): MenuItem[] {
    const items: MenuItem[] = [];
    if (this.env.isDashboard() && this.fullScreenMenuItem) {
      items.push(this.fullScreenMenuItem);
    }
    if (this.getAnnotationLink() || this.getAnnotationText()) {
      items.push({
        id: "chartInfo",
        label: _t("Chart Info"),
        icon: "o-spreadsheet-Icon.INFO",
        onClick: (ev: MouseEvent) => this.showInfo(ev),
      });
    }
    return items;
  }

  get figureId() {
    return this.env.model.getters.getFigureIdFromChartId(this.props.chartId);
  }

  get chartDefinition() {
    return this.env.model.getters.getChartDefinition(this.props.chartId);
  }

  get backgroundColor() {
    const color = this.chartDefinition.background;
    return "background-color: " + (color || BACKGROUND_CHART_COLOR);
  }

  onClose() {
    this.state.openedPopover = undefined;
    this.state.anchorRect = null;
    this.state.menuItems = [];
  }

  openContextMenu(ev: MouseEvent) {
    this.state.openedPopover = "menu";
    this.state.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
    this.state.menuItems = getChartMenuActions(this.figureId, this.env);
  }

  showInfo(ev: MouseEvent) {
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
    if (this.chartDefinition.type === "scorecard") {
      return undefined;
    }
    const isFullScreen = this.figureId === this.fullScreenFigureStore.fullScreenFigure?.id;
    return {
      id: "fullScreenChart",
      label: isFullScreen ? _t("Exit Full Screen") : _t("Full Screen"),
      icon: isFullScreen ? "o-spreadsheet-Icon.FULLSCREEN_OUT" : "o-spreadsheet-Icon.FULLSCREEN_IN",
      onClick: () => {
        this.fullScreenFigureStore.toggleFullScreenFigure(this.figureId);
      },
    };
  }

  get regionOptions(): ValueAndLabel[] {
    return this.env.model.getters
      .getAvailableChartRegions(this.props.chartId)
      .map((r) => ({ value: r.id, label: r.label }));
  }

  get selectedRegion(): string {
    const definition = this.env.model.getters.getChartDefinition(this.props.chartId);
    if (!definition.type.includes("geo")) {
      return "";
    }
    const geoDef = definition as GeoChartDefinition;
    const availableRegions = this.env.model.getters.getGeoChartAvailableRegions();
    return geoDef.region || availableRegions[0]?.id || "";
  }

  onRegionSelected(region: string) {
    this.env.model.dispatch("UPDATE_CHART_REGION", {
      chartId: this.props.chartId,
      region,
    });
  }

  isMenuAvailable() {
    return (
      (this.env.model.getters.isDashboard() || !this.env.model.getters.isReadonly()) &&
      this.props.displayEllipsis
    );
  }
}
