import { props, proxy } from "@odoo/owl";
import { Action } from "../../../../actions/action";
import { getChartMenuActions } from "../../../../actions/figure_menu_actions";
import { Component } from "../../../../owl3_compatibility_layer";
import { useStore } from "../../../../store_engine/store_hooks";
import { _t } from "../../../../translation";
import { GeoChartDefinition } from "../../../../types/chart/geo_chart";
import { MenuMouseEvent, ValueAndLabel } from "../../../../types/misc";
import { Rect } from "../../../../types/rendering";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { FullScreenFigureStore } from "../../../full_screen_figure/full_screen_figure_store";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { MenuPopover } from "../../../menu_popover/menu_popover";
import { types } from "../../../props_validation";
import { Select } from "../../../select/select";

import { InfoPopover } from "../../../info_popover/info_popover";

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

export class ChartMenu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartMenu";
  static components = { MenuPopover, InfoPopover, Select };
  protected props = props({
    chartId: types.UID(),
    hasFullScreenButton: types.boolean().optional(true),
    displayEllipsisButton: types.boolean().optional(true),
  });

  private fullScreenFigureStore!: Store<FullScreenFigureStore>;

  private state: ChartMenuState = proxy({
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
    if (this.fullScreenMenuItem) {
      items.push(this.fullScreenMenuItem);
    }
    if (this.getAnnotationLink() || this.getAnnotationText()) {
      items.push({
        id: "chartInfo",
        label: _t("Chart Info"),
        icon: "o-spreadsheet-Icon.INFO",
        onClick: (ev: MenuMouseEvent) => this.showInfo(ev),
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
    return "background-color: " + (color || "#FFFFFF");
  }

  onClose() {
    this.state.openedPopover = undefined;
    this.state.anchorRect = null;
    this.state.menuItems = [];
  }

  openContextMenu(ev: MenuMouseEvent) {
    if (ev.closedMenuId === "menu-popover") {
      this.onClose();
      return;
    }
    this.state.openedPopover = "menu";
    this.state.anchorRect = getBoundingRectAsPOJO(ev.currentTarget as HTMLElement);
    this.state.menuItems = getChartMenuActions(this.figureId, this.env);
  }

  showInfo(ev: MenuMouseEvent) {
    if (ev.closedMenuId === "info-popover") {
      this.onClose();
      return;
    }
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

  isMenuAvailable() {
    return (
      (this.env.model.getters.isDashboard() || !this.env.model.getters.isReadonly()) &&
      this.props.displayEllipsisButton
    );
  }
}
