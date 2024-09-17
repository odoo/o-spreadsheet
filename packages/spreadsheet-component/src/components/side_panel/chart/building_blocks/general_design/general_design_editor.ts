import { Component, useState } from "@odoo/owl";
import {
  ChartDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TitleDesign,
  UID,
} from "../../../../../types";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../title/title";

interface GeneralDesignEditorState {
  activeTool: string;
}

interface Props {
  figureId: UID;
  definition: ChartDefinition;
  updateChart: (figureId: UID, definition: Partial<ChartDefinition>) => DispatchResult;
}

export class GeneralDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeneralDesignEditor";
  static components = {
    RoundColorPicker,
    ChartTitle,
    Section,
    SidePanelCollapsible,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    slots: { type: Object, optional: true },
  };
  private state!: GeneralDesignEditorState;

  setup() {
    this.state = useState<GeneralDesignEditorState>({
      activeTool: "",
    });
  }

  get title(): TitleDesign {
    return this.props.definition.title;
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
    const title = { ...this.title, text: newTitle };
    this.props.updateChart(this.props.figureId, { title });
  }

  get titleStyle(): TitleDesign {
    return {
      align: "left",
      ...this.title,
    };
  }

  updateChartTitleColor(color: Color) {
    const title = { ...this.title, color };
    this.props.updateChart(this.props.figureId, { title });
    this.state.activeTool = "";
  }

  toggleBoldChartTitle() {
    let title = this.title;
    title = { ...title, bold: !title.bold };
    this.props.updateChart(this.props.figureId, { title });
  }

  toggleItalicChartTitle() {
    let title = this.title;
    title = { ...title, italic: !title.italic };
    this.props.updateChart(this.props.figureId, { title });
  }

  updateChartTitleAlignment(align: "left" | "center" | "right") {
    const title = { ...this.title, align };
    this.props.updateChart(this.props.figureId, { title });
    this.state.activeTool = "";
  }
}
