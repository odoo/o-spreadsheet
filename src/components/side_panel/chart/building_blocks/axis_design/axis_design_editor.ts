import { Component, useState } from "@odoo/owl";
import { CHART_AXIS_TITLE_FONT_SIZE } from "../../../../../constants";
import { deepCopy } from "../../../../../helpers";
import { getDefinedAxis } from "../../../../../helpers/figures/charts";
import { _t } from "../../../../../translation";
import {
  AxisDesign,
  AxisScaleType,
  ChartWithAxisDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  TitleDesign,
  UID,
} from "../../../../../types";
import { LineChartRuntime } from "../../../../../types/chart";
import { BadgeSelection } from "../../../components/badge_selection/badge_selection";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../chart_title/chart_title";

export interface AxisDefinition {
  id: string;
  name: string;
}

interface Props {
  chartId: UID;
  definition: ChartWithAxisDefinition;
  updateChart: (chartId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  axesList: AxisDefinition[];
}

export class AxisDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AxisDesignEditor";
  static components = { Section, ChartTitle, BadgeSelection, Checkbox };
  static props = { chartId: String, definition: Object, updateChart: Function, axesList: Array };

  state = useState({ currentAxis: "x" });

  defaultFontSize = CHART_AXIS_TITLE_FONT_SIZE;

  get axisTitleStyle(): TitleDesign {
    return this.props.definition.axesDesign?.[this.state.currentAxis]?.title ?? {};
  }

  get badgeAxes() {
    return this.props.axesList.map((axis) => ({ value: axis.id, label: axis.name }));
  }

  updateAxisEditor(ev) {
    this.state.currentAxis = ev.target.value;
  }

  getAxisTitle() {
    const axesDesign = this.props.definition.axesDesign ?? {};
    return axesDesign[this.state.currentAxis]?.title?.text || "";
  }

  updateAxisTitle(text: string) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: {
        ...axesDesign?.[this.state.currentAxis]?.title,
        text,
      },
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  updateAxisTitleStyle(style: TitleDesign) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: style,
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  get axisMin(): number | undefined {
    return this.currentAxisDesign?.min;
  }

  get axisMax(): number | undefined {
    return this.currentAxisDesign?.max;
  }

  get axisScaleType(): AxisScaleType {
    return this.currentAxisDesign?.scaleType ?? "linear";
  }

  get isMajorGridEnabled(): boolean {
    const designValue = this.currentAxisDesign?.grid?.major;
    if (designValue !== undefined) {
      return designValue;
    }
    return this.getDefaultMajorGridValue(this.state.currentAxis);
  }

  get isMinorGridEnabled(): boolean {
    return !!this.currentAxisDesign?.grid?.minor;
  }

  get majorGridLabel() {
    return this.state.currentAxis === "x"
      ? _t("Vertical major gridlines")
      : _t("Horizontal major gridlines");
  }

  get minorGridLabel() {
    return this.state.currentAxis === "x"
      ? _t("Vertical minor gridlines")
      : _t("Horizontal minor gridlines");
  }

  updateAxisMin(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).value.trim();
    const parsed = value === "" ? undefined : Number(value);
    if (parsed === undefined || !isNaN(parsed)) {
      const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        min: parsed,
      };
      this.props.updateChart(this.props.chartId, { axesDesign });
    }
  }

  updateAxisMax(ev: InputEvent) {
    const value = (ev.target as HTMLInputElement).value.trim();
    const parsed = value === "" ? undefined : Number(value);
    if (parsed === undefined || !isNaN(parsed)) {
      const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        max: parsed,
      };
      this.props.updateChart(this.props.chartId, { axesDesign });
    }
  }

  updateAxisScaleType(ev: InputEvent) {
    const type = (ev.target as HTMLSelectElement).value as AxisScaleType;
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      scaleType: type === "linear" ? undefined : type,
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  toggleMajorGrid(major: boolean) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      grid: {
        ...axesDesign[this.state.currentAxis]?.grid,
        major,
      },
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  toggleMinorGrid(minor: boolean) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      grid: {
        ...axesDesign[this.state.currentAxis]?.grid,
        minor,
      },
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  private get currentAxisDesign(): AxisDesign | undefined {
    return this.props.definition.axesDesign?.[this.state.currentAxis];
  }

  private getDefaultMajorGridValue(axisId: string): boolean {
    const { useLeftAxis, useRightAxis } = getDefinedAxis(this.props.definition);
    if (axisId === "x") {
      if ("horizontal" in this.props.definition && this.props.definition.horizontal) {
        return true;
      }
      if (this.props.definition.type === "scatter") {
        return true;
      }
    } else if (axisId === "y") {
      return true;
    } else if (axisId === "y1") {
      return !useLeftAxis && useRightAxis;
    }
    return false;
  }

  get isCategoricalAxis(): boolean {
    if (this.state.currentAxis !== "x") {
      return false;
    }
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId) as LineChartRuntime;
    const axisType = runtime?.chartJsConfig.options?.scales?.x?.type;
    return axisType === undefined || axisType === "time";
  }

  get canChangeMinorGridVisibility(): boolean {
    if (this.state.currentAxis !== "x") {
      return true;
    }
    if (this.isCategoricalAxis) {
      return false;
    }
    const type = this.props.definition.type;
    return type === "line" || type === "scatter";
  }
}
