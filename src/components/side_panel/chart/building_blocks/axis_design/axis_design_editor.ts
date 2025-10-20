import { _t } from "@odoo/o-spreadsheet-engine";
import { CHART_AXIS_TITLE_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import { AxisType, LineChartRuntime } from "@odoo/o-spreadsheet-engine/types/chart";
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
import { NumberInput } from "../../../../number_input/number_input";
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
  static components = { Section, ChartTitle, BadgeSelection, Checkbox, NumberInput };
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

  get axisMin(): string | number {
    const min = this.currentAxisDesign?.min;
    return (this.isTimeAxis ? this.formatAxisBoundary(min) : min) ?? "";
  }

  get axisMax(): string | number {
    const max = this.currentAxisDesign?.max;
    return (this.isTimeAxis ? this.formatAxisBoundary(max) : max) ?? "";
  }

  get axisBoundsInputType(): "number" | "date" {
    return this.isTimeAxis ? "date" : "number";
  }

  get axisBoundsInputStep(): string | null {
    return this.isTimeAxis ? "1" : null;
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
      ? _t("Vertical major gridlines")
      : _t("Horizontal major gridlines");
  }

  get minorGridLabel() {
    return this.state.currentAxis === "x"
      ? _t("Vertical minor gridlines")
      : _t("Horizontal minor gridlines");
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

  updateTimeAxisMin(ev: InputEvent) {
    const min = this.parseTimeAxisBoundaryValue(ev);
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

  updateTimeAxisMax(ev: InputEvent) {
    const max = this.parseTimeAxisBoundaryValue(ev);
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
    let gridLines = "none";
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
    let gridLines = "none";
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

  private parseTimeAxisBoundaryValue(ev: InputEvent): number | undefined | null {
    const input = ev.target as HTMLInputElement;
    const value = input.value.trim();
    if (value === "") {
      return undefined;
    }
    const valueAsNumber = input.valueAsNumber as number | undefined;
    if (!valueAsNumber) {
      return null;
    }
    const date = DateTime.fromTimestamp(valueAsNumber);
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
