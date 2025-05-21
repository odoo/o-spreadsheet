import { Component, useState } from "@odoo/owl";
import { CHART_TITLE_FONT_SIZE } from "../../../../../constants";
import {
  ChartDefinition,
  Color,
  DispatchResult,
  SpreadsheetChildEnv,
  TitleDesign,
  UID,
} from "../../../../../types";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RadioSelection } from "../../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../chart_title/chart_title";

interface GeneralDesignEditorState {
  activeTool: string;
}

interface Props {
  figureId: UID;
  definition: ChartDefinition;
  updateChart: (figureId: UID, definition: Partial<ChartDefinition>) => DispatchResult;
  canUpdateChart: (figureId: UID, definition: Partial<ChartDefinition>) => DispatchResult;
  defaultChartTitleFontSize?: number;
}

export class GeneralDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeneralDesignEditor";
  static components = {
    RoundColorPicker,
    ChartTitle,
    Section,
    SidePanelCollapsible,
    RadioSelection,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    defaultChartTitleFontSize: { type: Number, optional: true },
    slots: { type: Object, optional: true },
  };
  static defaultProps = {
    defaultChartTitleFontSize: CHART_TITLE_FONT_SIZE,
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

  updateChartTitleStyle(style: TitleDesign) {
    const title = { ...this.title, ...style };
    this.props.updateChart(this.props.figureId, { title });
    this.state.activeTool = "";
  }
}
