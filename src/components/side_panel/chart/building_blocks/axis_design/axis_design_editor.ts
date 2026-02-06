import { _t } from "@odoo/o-spreadsheet-engine";
import { CHART_AXIS_TITLE_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import {
  AxisGridType,
  AxisId,
  AxisType,
  LineChartRuntime,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { DateTime, deepCopy, formatValue, jsDateToNumber } from "../../../../../helpers";
import { getDefinedAxis } from "../../../../../helpers/figures/charts";
import {
  AxisDesign,
  ChartWithAxisDefinition,
  DispatchResult,
  TitleDesign,
  UID,
} from "../../../../../types";
import { DateInput } from "../../../../date_input/date_input";
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
  static components = { Section, ChartTitle, BadgeSelection, Checkbox, NumberInput, DateInput };
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

  get axisMin(): string | number {
    const min = this.currentAxisDesign?.min;
    return (this.isTimeAxis ? this.formatAxisBoundary(min) : min) ?? "";
  }

  get axisMax(): string | number {
    const max = this.currentAxisDesign?.max;
    return (this.isTimeAxis ? this.formatAxisBoundary(max) : max) ?? "";
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
    const min = value === "" ? undefined : Number(value);
    if (min === undefined || !isNaN(min)) {
      const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        min,
      };
      this.props.updateChart(this.props.chartId, { axesDesign });
    }
  }

  updateTimeAxisMin(value: string) {
    const min = this.parseTimeAxisBoundaryValue(value);
    if (min === null) {
      return;
    }
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      min,
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
  }

  updateAxisMax(value: string) {
    const max = value === "" ? undefined : Number(value);
    if (max === undefined || !isNaN(max)) {
      const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
      axesDesign[this.state.currentAxis] = {
        ...axesDesign[this.state.currentAxis],
        max,
      };
      this.props.updateChart(this.props.chartId, { axesDesign });
    }
  }

  updateTimeAxisMax(value: string) {
    const max = this.parseTimeAxisBoundaryValue(value);
    if (max === null) {
      return;
    }
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      max,
    };
    this.props.updateChart(this.props.chartId, { axesDesign });
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
    const axisType = this.getXAxisType();
    return axisType === undefined || axisType === "category";
  }

  get isTimeAxis(): boolean {
    return this.state.currentAxis === "x" && this.getXAxisType() === "time";
  }

  get canChangeMinorGridVisibility(): boolean {
    if (this.isValueAxis) {
      return true;
    }
    if (this.isCategoricalAxis) {
      return false;
    }
    const type = this.props.definition.type;
    return type === "line" || type === "scatter";
  }

  private parseTimeAxisBoundaryValue(value: string): number | undefined | null {
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return undefined;
    }
    const date = DateTime.fromTimestamp(new Date(trimmedValue).getTime());
    const dateNumber = jsDateToNumber(date);
    return Number.isNaN(dateNumber) ? null : dateNumber;
  }

  private formatAxisBoundary(value: number | undefined): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return formatValue(value, { format: "yyyy-mm-dd", locale: this.env.model.getters.getLocale() });
  }

  private getXAxisType(): AxisType | undefined {
    const runtime = this.env.model.getters.getChartRuntime(this.props.chartId) as LineChartRuntime;
    return runtime?.chartJsConfig.options?.scales?.x?.type as AxisType | undefined;
  }
}
