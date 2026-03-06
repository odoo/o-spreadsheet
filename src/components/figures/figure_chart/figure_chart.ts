import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { chartComponentRegistry } from "../../../registries/chart_component_registry";
import { ChartType, CSSProperties, FigureUI, MenuMouseEvent, Rect, UID } from "../../../types";
import { getRefBoundingRect } from "../../helpers/dom_helpers";
import { InfoPopover } from "../../info_popover/info_popover";
import { ChartDashboardMenu } from "../chart/chart_dashboard_menu/chart_dashboard_menu";

interface Props {
  // props figure is currently necessary scorecards, we need the chart dimension at render to avoid having to force the
  // style by hand in the useEffect()
  figureUI: FigureUI;
  editFigureStyle?: (properties: CSSProperties) => void;
  isFullScreen?: boolean;
  openContextMenu?: (anchorRect: Rect, onClose?: () => void) => void;
}

export interface InfoState {
  isOpen: boolean;
  anchorRect: null | Rect;
}

export class ChartFigure extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartFigure";
  static props = {
    figureUI: Object,
    editFigureStyle: { type: Function, optional: true },
    isFullScreen: { type: Boolean, optional: true },
    openContextMenu: { type: Function, optional: true },
  };
  static components = { ChartDashboardMenu, InfoPopover };

  private infoState: InfoState = useState({ isOpen: false, anchorRect: null });
  private infoButtonRef = useRef("infoButton");

  onDoubleClick() {
    this.env.model.dispatch("SELECT_FIGURE", { figureId: this.props.figureUI.id });
    this.env.openSidePanel("ChartPanel");
  }

  get chartType(): ChartType {
    return this.env.model.getters.getChartType(this.chartId);
  }

  get chartId(): UID {
    const chartId = this.env.model.getters.getChartIdFromFigureId(this.props.figureUI.id);
    if (!chartId) {
      throw new Error(`No chart found for figure ID: ${this.props.figureUI.id}`);
    }
    return chartId;
  }

  get chartComponent(): new (...args: any) => Component {
    const type = this.chartType;
    const component = chartComponentRegistry.get(type);
    if (!component) {
      throw new Error(`Component is not defined for type ${type}`);
    }
    return component;
  }

  showInfo(ev: MenuMouseEvent) {
    if (ev.closedMenuId === "info-popover") {
      this.infoState.isOpen = false;
      return;
    }
    this.infoState.isOpen = true;
    this.infoState.anchorRect = getRefBoundingRect(this.infoButtonRef);
  }

  getAnnotationText() {
    const chart = this.env.model.getters.getChartFromFigureId(this.props.figureUI.id);
    return chart?.annotationText;
  }

  getAnnotationLink() {
    const chart = this.env.model.getters.getChartFromFigureId(this.props.figureUI.id);
    return chart?.annotationLink;
  }
}
