import { Component, useState } from "@odoo/owl";
import {
  ChartWithAxisDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TitleDesign,
  UID,
} from "../../../../../types";
import { WaterfallChartDefinition } from "../../../../../types/chart/waterfall_chart";
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
  static components = {
    Section,
    ChartTitle,
  };
  state = useState({ currentAxis: "x" });

  get axisTitleStyle(): TitleDesign {
    const axisDesign = this.props.definition.axesDesign?.[this.state.currentAxis] ?? {};
    return {
      color: "",
      align: "center",
      ...axisDesign.title,
    };
  }

  updateAxisTitleColor(color: Color) {
    const axesDesign = this.props.definition.axesDesign ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: {
        ...(axesDesign[this.state.currentAxis]?.title ?? {}),
        color,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  toggleBoldAxisTitle() {
    const axesDesign = this.props.definition.axesDesign ?? {};
    const title = axesDesign[this.state.currentAxis]?.title ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: {
        ...title,
        bold: !title?.bold,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  toggleItalicAxisTitle() {
    const axesDesign = this.props.definition.axesDesign ?? {};
    const title = axesDesign[this.state.currentAxis]?.title ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: {
        ...title,
        italic: !title?.italic,
      },
    };
    this.props.updateChart(this.props.figureId, { axesDesign });
  }

  updateAxisTitleAlignment(align: "left" | "center" | "right") {
    const axesDesign = this.props.definition.axesDesign ?? {};
    const title = axesDesign[this.state.currentAxis]?.title ?? {};
    axesDesign[this.state.currentAxis] = {
      ...axesDesign[this.state.currentAxis],
      title: {
        ...title,
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
}
