import { Component, useState } from "@odoo/owl";
import { toHex } from "../../../../helpers";
import { getChartTitle } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import { BarChartDefinition } from "../../../../types/chart/bar_chart";
import { LineChartDefinition } from "../../../../types/chart/line_chart";
import { PieChartDefinition } from "../../../../types/chart/pie_chart";
import {
  ChartRuntime,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";
import { css } from "../../../helpers";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { Section } from "../../components/section/section";
import { ChartColor } from "../building_blocks/color/color";
import { ChartTitle } from "../building_blocks/title/title";

interface PanelState {
  index: number;
  currentAxis: string;
  activeTool: string;
}

interface Props {
  figureId: UID;
  definition: LineChartDefinition | BarChartDefinition | PieChartDefinition;
  canUpdateChart: (
    definition: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>
  ) => DispatchResult;
  updateChart: (
    figureId: UID,
    definition: Partial<LineChartDefinition | BarChartDefinition | PieChartDefinition>
  ) => DispatchResult;
  getRuntime?: (figureId: UID) => ChartRuntime;
}

css/* scss */ `
  .o-chart-title-designer {
    position: relative;
    display: flex;
    align-items: center;

    > span {
      height: 30px;
    }

    .o-menu-item-button.active {
      background-color: #e6f4ea;
      color: #188038;
    }

    .o-dropdown-content {
      position: absolute;
      top: 100%;
      left: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2px;
      z-index: 100;
      box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);
      background-color: white;

      .o-dropdown-line {
        display: flex;

        > span {
          padding: 4px;
        }
      }
    }
  }
`;

export class LineBarPieDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-LineBarPieDesignPanel";
  static components = { ChartColor, ChartTitle, Section, ColorPickerWidget, SidePanelCollapsible };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    getRuntime: { type: Function, optional: true },
  };
  private state!: PanelState;

  setup() {
    const runtime = this.props.getRuntime?.(this.props.figureId);
    if (!runtime) {
      return;
    }
    this.state = useState({
      index: 0,
      currentAxis: "x",
      activeTool: "",
    });
  }

  get title() {
    return _t(getChartTitle(this.props.definition.title));
  }

  toggleDropdownTool(tool: string, ev: MouseEvent) {
    const isOpen = this.state.activeTool === tool;
    this.state.activeTool = isOpen ? "" : tool;
  }

  updateBackgroundColor(color: Color) {
    this.props.updateChart(this.props.figureId, {
      background: color,
    });
  }

  updateTitle(newTitle: string) {
    let title = this.props.definition.title;
    if (typeof title === "string") {
      title = {};
    }
    title = { ...title, title: newTitle };
    this.props.updateChart(this.props.figureId, { title });
  }

  getTitleColor(type: string) {
    if (type === "chart") {
      const title = this.props.definition.title;
      if (typeof title === "string") {
        return "";
      }
      return title.color;
    } else if (type === "axis") {
      const axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      return axesDesign[this.state.currentAxis]?.title?.color;
    }
    return "";
  }

  updateTitleColor(type: string, color: Color) {
    if (type === "chart") {
      let title = this.props.definition.title;
      if (typeof title === "string") {
        title = {};
      }
      title = { ...title, color };
      this.props.updateChart(this.props.figureId, { title });
    } else if (type === "axis") {
      let axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        title: {
          ...axesDesign[this.state.currentAxis].title,
          color,
        },
      };
      this.props.updateChart(this.props.figureId, { axesDesign });
      this.state.activeTool = "";
    }
    this.state.activeTool = "";
  }

  toggleBoldTitle(type: string) {
    if (type === "chart") {
      let title = this.props.definition.title;
      if (typeof title === "string") {
        title = {};
      }
      title = { ...title, bold: !title.bold };
      this.props.updateChart(this.props.figureId, { title });
    } else {
      let axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        title: {
          ...axesDesign[this.state.currentAxis].title,
          bold: !axesDesign[this.state.currentAxis].title.bold,
        },
      };
      this.props.updateChart(this.props.figureId, { axesDesign });
    }
  }

  isTitleBold(type: string): boolean | undefined {
    if (type === "chart") {
      const title = this.props.definition.title;
      if (typeof title === "string") {
        return false;
      }
      return title.bold;
    } else if (type === "axis") {
      const axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      return axesDesign[this.state.currentAxis]?.title?.bold;
    } else {
      return false;
    }
  }

  toggleItalicTitle(type: string) {
    if (type === "chart") {
      let title = this.props.definition.title;
      if (typeof title === "string") {
        title = {};
      }
      title = { ...title, italic: !title.italic };
      this.props.updateChart(this.props.figureId, { title });
    } else if (type === "axis") {
      let axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        title: {
          ...axesDesign[this.state.currentAxis].title,
          italic: !axesDesign[this.state.currentAxis].title.italic,
        },
      };
      this.props.updateChart(this.props.figureId, { axesDesign });
    }
  }

  isTitleItalic(type: string): boolean | undefined {
    if (type === "chart") {
      const title = this.props.definition.title;
      if (typeof title === "string") {
        return false;
      }
      return title.italic;
    } else if (type === "axis") {
      const axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      return axesDesign[this.state.currentAxis]?.title?.italic;
    } else {
      return false;
    }
  }

  getTitleAlignment(type: string) {
    if (type === "chart") {
      const title = this.props.definition.title;
      if (typeof title === "string") {
        return "center";
      }
      return title.align;
    } else if (type === "axis") {
      const axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      return axesDesign[this.state.currentAxis]?.title?.align ?? "center";
    } else {
      return "center";
    }
  }

  updateTitleAlignment(type: string, align: "left" | "center" | "right") {
    if (type === "chart") {
      let title = this.props.definition.title;
      if (typeof title === "string") {
        title = {};
      }
      title = { ...title, align };
      this.props.updateChart(this.props.figureId, { title });
    } else if (type === "axis") {
      let axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        title: {
          ...axesDesign[this.state.currentAxis].title,
          align,
        },
      };
      this.props.updateChart(this.props.figureId, { axesDesign });
    }
    this.state.activeTool = "";
  }

  updateSelect(attr: string, ev) {
    this.props.updateChart(this.props.figureId, {
      [attr]: ev.target.value,
    });
  }

  getDataSeries() {
    const runtime = this.props.getRuntime?.(this.props.figureId);
    if (!runtime) {
      return [];
    }
    //@ts-ignore
    return runtime.chartJsConfig.data.datasets.map((d) => d.label);
  }

  updateSerieEditor(ev) {
    const chartId = this.props.figureId;
    const selectedIndex = ev.target.selectedIndex;
    const runtime = this.props.getRuntime?.(chartId);
    if (!runtime) {
      return;
    }
    this.state.index = selectedIndex;
  }

  updateDataSeriesColor(color: string) {
    const dataSetDesign = (this.props.definition as BarChartDefinition).dataSetDesign ?? [];
    if (dataSetDesign.length < this.state.index) {
      for (let i = dataSetDesign.length; i <= this.state.index; i++) {
        dataSetDesign.push({});
      }
    }
    dataSetDesign[this.state.index] = {
      ...dataSetDesign[this.state.index],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.figureId, { dataSetDesign });
  }

  getDataSerieColor() {
    const dataSetDesign = (this.props.definition as BarChartDefinition).dataSetDesign ?? [];
    const color = dataSetDesign[this.state.index]?.backgroundColor;
    return color ? toHex(color) : "";
  }

  updateDataSeriesAxis(ev) {
    const axis = ev.target.value;
    const dataSetDesign = (this.props.definition as BarChartDefinition).dataSetDesign ?? [];
    if (dataSetDesign.length < this.state.index) {
      for (let i = dataSetDesign.length; i <= this.state.index; i++) {
        dataSetDesign.push({});
      }
    }
    dataSetDesign[this.state.index] = {
      ...dataSetDesign[this.state.index],
      yAxisID: axis === "left" ? "y" : "y1",
    };
    this.props.updateChart(this.props.figureId, { dataSetDesign });
  }

  getDataSerieAxis() {
    const dataSetDesign = (this.props.definition as BarChartDefinition).dataSetDesign ?? [];
    return dataSetDesign[this.state.index]?.yAxisID === "y1" ? "right" : "left";
  }

  updateDataSeriesLabel(ev) {
    const label = ev.target.value;
    const dataSetDesign = (this.props.definition as BarChartDefinition).dataSetDesign ?? [];
    if (dataSetDesign.length < this.state.index) {
      for (let i = dataSetDesign.length; i <= this.state.index; i++) {
        dataSetDesign.push({});
      }
    }
    dataSetDesign[this.state.index] = {
      ...dataSetDesign[this.state.index],
      label,
    };
    this.props.updateChart(this.props.figureId, { dataSetDesign });
  }

  getDataSerieLabel() {
    const dataSetDesign = (this.props.definition as BarChartDefinition).dataSetDesign ?? [];
    return dataSetDesign[this.state.index]?.label || "";
  }

  updateAxisEditor(ev) {
    const axis = ev.target.value;
    this.state.currentAxis = axis;
  }

  getAxisTitle() {
    const axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
    return axesDesign[this.state.currentAxis]?.title.title || "";
  }

  updateAxisTitle(ev) {
    const title = ev.target.value;
    const axesDesign = (this.props.definition as BarChartDefinition).axesDesign ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: {
        ...axesDesign[this.state.currentAxis].title,
        title,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }
}
