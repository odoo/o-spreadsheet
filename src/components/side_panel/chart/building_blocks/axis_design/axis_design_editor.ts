import { Component, useState } from "@odoo/owl";
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
import { TextStyler } from "../text_styler/text_styler";

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
  static components = { Section, TextStyler, BadgeSelection };
  static props = { figureId: String, definition: Object, updateChart: Function, axesList: Array };

  state = useState({ currentAxis: "x" });

  get axisTitleStyle(): TitleDesign {
    const axisDesign = this.props.definition.axesDesign?.[this.state.currentAxis] ?? {};
    return axisDesign.title || {};
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
    const axesDesign = this.props.definition.axesDesign ?? {};
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
    const axesDesign = this.props.definition.axesDesign ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: style,
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }
}
