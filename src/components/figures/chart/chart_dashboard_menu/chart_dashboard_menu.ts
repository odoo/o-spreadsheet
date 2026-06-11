import { props, proxy } from "@odoo/owl";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { isDefined } from "../../../../helpers/misc";
import { Component } from "../../../../owl3_compatibility_layer";
import { useStore } from "../../../../store_engine/store_hooks";
import { _t } from "../../../../translation";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { ValueAndLabel } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { FullScreenFigureStore } from "../../../full_screen_figure/full_screen_figure_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover, MenuState } from "../../../menu_popover/menu_popover";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";

interface MenuItem {
  id: string;
  label: string;
  class: string;
  onClick: () => void;
  preview?: string;
  icon?: string;
}

export class ChartDashboardMenu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartDashboardMenu";
  static components = { MenuPopover, Select };

  protected props = props(
    {
      chartId: types.UID(),
      "hasFullScreenButton?": types.boolean(),
    },
    {
      hasFullScreenButton: true,
    }
  );

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
    return (
      "background-color: " + (color || this.env.model.getters.getSpreadsheetTheme().backgroundColor)
    );
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
      class: "text-muted oi",
      icon: isFullScreen ? "close_fullscreen" : "open_in_full",
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
