import { proxy } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { BACKGROUND_CHART_COLOR } from "../../../../constants";
import { isDefined } from "../../../../helpers";
import { Component } from "../../../../owl3_compatibility_layer";
import { Store, useStore } from "../../../../store_engine";
import { _t } from "../../../../translation";
import { UID, ValueAndLabel } from "../../../../types";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { FullScreenFigureStore } from "../../../full_screen_figure/full_screen_figure_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { Select } from "../../../select/select";

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
  static components = { MenuPopover, Select };
  static props = { chartId: String, hasFullScreenButton: { type: Boolean, optional: true } };
  static defaultProps = { hasFullScreenButton: true };

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  private menuState: MenuState = proxy({ isOpen: false, anchorRect: null, menuItems: [] });
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
    const geoDef = definition as GeoChartDefinition<string>;
    const availableRegions = this.env.model.getters.getGeoChartAvailableRegions();
    return geoDef.region || availableRegions[0]?.id || "";
  }

  onRegionSelected(region: string) {
    this.env.model.dispatch("UPDATE_CHART_REGION", {
      chartId: this.props.chartId,
      region,
    });
  }
}
