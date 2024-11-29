import { Component, useState } from "@odoo/owl";
import { CHART_AXIS_TITLE_FONT_SIZE } from "../../../../../constants";
import { deepCopy } from "../../../../../helpers";
import {
  ChartWithDataSetDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  TitleDesign,
  UID,
} from "../../../../../types";
import { WaterfallChartDefinition } from "../../../../../types/chart/waterfall_chart";
import { BadgeSelection } from "../../../components/badge_selection/badge_selection";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../chart_title/chart_title";

export interface AxisDefinition {
  id: string;
  name: string;
}

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition | WaterfallChartDefinition;
  updateChart: (
    figureId: UID,
    definition: Partial<ChartWithDataSetDefinition | WaterfallChartDefinition>
  ) => DispatchResult;
  axesList: AxisDefinition[];
}

export class AxisDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-AxisDesignEditor";
  static components = { Section, ChartTitle, BadgeSelection };
  static props = { figureId: String, definition: Object, updateChart: Function, axesList: Array };

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
    return axesDesign[this.state.currentAxis]?.title.text || "";
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
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  updateAxisTitleStyle(style: TitleDesign) {
    const axesDesign = deepCopy(this.props.definition.axesDesign) ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: style,
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }
}
