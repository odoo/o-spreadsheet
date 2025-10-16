import { _t } from "@odoo/o-spreadsheet-engine";
import { CHART_AXIS_TITLE_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import { AxisGridType, AxisId, LineChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { deepCopy } from "../../../../../helpers";
import { getDefinedAxis } from "../../../../../helpers/figures/charts";
import {
  AxisDesign,
  ChartWithAxisDefinition,
  DispatchResult,
  TitleDesign,
  UID,
} from "../../../../../types";
import { NumberInput } from "../../../../number_input/number_input";
import { BadgeSelection } from "../../../components/badge_selection/badge_selection";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../chart_title/chart_title";

export interface AxisDefinition {
  id: AxisId;
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
  static components = { Section, ChartTitle, BadgeSelection, Checkbox, NumberInput };
  static props = { chartId: String, definition: Object, updateChart: Function, axesList: Array };

  state: { currentAxis: AxisId } = useState({ currentAxis: "x" });

  defaultFontSize = CHART_AXIS_TITLE_FONT_SIZE;

  get axisTitleStyle(): TitleDesign {
    return this.props.definition.axesDesign?.[this.state.currentAxis]?.title ?? {};
  }

  get badgeAxes() {
    return this.props.axesList.map((axis) => ({ value: axis.id, label: axis.name }));
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

  get axisMin(): number | string {
    return this.currentAxisDesign?.min ?? "";
  }

  get axisMax(): number | string {
    return this.currentAxisDesign?.max ?? "";
  }

  get isMajorGridEnabled(): boolean {
    const designValue = this.currentAxisDesign?.gridLines;
    if (designValue !== undefined) {
      return designValue === "major" || designValue === "both";
    }
    return this.getDefaultMajorGridValue(this.state.currentAxis);
  }

  get isMinorGridEnabled(): boolean {
    return (
      this.currentAxisDesign?.gridLines === "minor" || this.currentAxisDesign?.gridLines === "both"
    );
  }

  get isValueAxis(): boolean {
    if ("horizontal" in this.props.definition && this.props.definition.horizontal) {
      return this.state.currentAxis === "x";
    }
    return this.state.currentAxis !== "x";
  }

  get majorGridLabel() {
    return this.state.currentAxis === "x"
      ? _t("Major vertical gridlines")
      : _t("Major horizontal gridlines");
  }

  get minorGridLabel() {
    return this.state.currentAxis === "x"
      ? _t("Minor vertical gridlines")
      : _t("Minor horizontal gridlines");
  }

  updateAxisMin(value: string) {
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

  updateAxisMax(value: string) {
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

  toggleMajorGrid(major: boolean) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    let gridLines: AxisGridType = "none";
    if (this.isMinorGridEnabled) {
      gridLines = major ? "both" : "minor";
    } else {
      gridLines = major ? "major" : "none";
    }
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      gridLines,
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  toggleMinorGrid(minor: boolean) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    let gridLines: AxisGridType = "none";
    if (this.isMajorGridEnabled) {
      gridLines = minor ? "both" : "major";
    } else {
      gridLines = minor ? "minor" : "none";
    }
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      gridLines,
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  private get currentAxisDesign(): AxisDesign | undefined {
    return this.props.definition.axesDesign?.[this.state.currentAxis];
  }

  private getDefaultMajorGridValue(axisId: AxisId): boolean {
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
    if (this.isValueAxis) {
      return false;
    }
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId) as LineChartRuntime;
    const axisType = runtime?.chartJsConfig.options?.scales?.x?.type;
    return axisType === undefined || axisType === "time";
  }
}
