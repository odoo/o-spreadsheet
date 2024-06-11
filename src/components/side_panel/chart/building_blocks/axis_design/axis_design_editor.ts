import { Component, useState } from "@odoo/owl";
import {
  AxesDesign,
  ChartTitleType,
  ChartWithAxisDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  Title,
  TitleDesign,
  UID,
} from "../../../../../types";
import { WaterfallChartDefinition } from "../../../../../types/chart/waterfall_chart";
import { BadgeSelection } from "../../../components/badge_selection/badge_selection";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../title/title";

export interface AxisDefinition {
  id: string;
  name: string;
}

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition | WaterfallChartDefinition;
  updateChart: (
    figureId: UID,
    definition: Partial<ChartWithAxisDefinition | WaterfallChartDefinition>
  ) => DispatchResult;
  axesList: AxisDefinition[];
}

export class AxisDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AxisDesignEditor";
  static components = { Section, ChartTitle, BadgeSelection };
  static props = { figureId: String, definition: Object, updateChart: Function, axesList: Array };

  state = useState({ currentAxis: "x" });

  get axisTitleStyle(): TitleDesign {
    const axisDesign: Title = this.props.definition.axesDesign?.[this.state.currentAxis] ?? {};
    return {
      color: "",
      align: "center",
      ...axisDesign.design,
    };
  }

  get badgeAxes() {
    return this.props.axesList.map((axis) => ({ value: axis.id, label: axis.name }));
  }

  updateAxisTitleColor(color: Color) {
    const axesDesign: AxesDesign = this.props.definition.axesDesign ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      design: {
        ...(axesDesign[this.state.currentAxis]?.design ?? {}),
        color,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  toggleBoldAxisTitle() {
    const axesDesign: AxesDesign = this.props.definition.axesDesign ?? {};
    const design: TitleDesign = axesDesign[this.state.currentAxis]?.design ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      design: {
        ...design,
        bold: !design?.bold,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  toggleItalicAxisTitle() {
    const axesDesign: AxesDesign = this.props.definition.axesDesign ?? {};
    const design: TitleDesign = axesDesign[this.state.currentAxis]?.design ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      design: {
        ...design,
        italic: !design?.italic,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  updateAxisTitleAlignment(align: "left" | "center" | "right") {
    const axesDesign: AxesDesign = this.props.definition.axesDesign ?? {};
    const design: TitleDesign = axesDesign[this.state.currentAxis]?.design ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      design: {
        ...design,
        align,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  updateAxisEditor(ev) {
    const axis = ev.target.value;
    this.state.currentAxis = axis;
  }

  getAxisTitle() {
    const axesDesign = this.props.definition.axesDesign ?? {};
    return axesDesign[this.state.currentAxis];
  }

  updateAxisTitle(text: string, type: ChartTitleType) {
    const axesDesign: AxesDesign = this.props.definition.axesDesign ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      text,
      type,
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }
}
