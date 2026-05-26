import { props, proxy } from "@odoo/owl";
import { CHART_TITLE_FONT_SIZE } from "../../../../../constants";
import { Component } from "../../../../../owl3_compatibility_layer";
import { ChartDefinition, TitleDesign } from "../../../../../types/chart/chart";
import { DispatchResult } from "../../../../../types/commands";
import { Color, UID } from "../../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RadioSelection } from "../../../components/radio_selection/radio_selection";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";
import { ChartTitle } from "../chart_title/chart_title";

interface GeneralDesignEditorState {
  activeTool: string;
}

export class GeneralDesignEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeneralDesignEditor";
  static components = {
    RoundColorPicker,
    ChartTitle,
    Section,
    SidePanelCollapsible,
    RadioSelection,
  };

  protected props = props(
    {
      chartId: types.UID(),
      definition: types.ChartDefinition(),
      canUpdateChart: types.function<
        [chartId: UID, definition: Partial<ChartDefinition<string>>],
        DispatchResult
      >([types.UID(), types.object({})], types.DispatchResult()),
      updateChart: types.function<
        [chartId: UID, definition: Partial<ChartDefinition<string>>],
        DispatchResult
      >([types.UID(), types.object({})], types.DispatchResult()),
      "defaultChartTitleFontSize?": types.number(),
    },
    {
      defaultChartTitleFontSize: CHART_TITLE_FONT_SIZE,
    }
  );
  private state!: GeneralDesignEditorState;

  setup() {
    this.state = proxy<GeneralDesignEditorState>({
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
    this.props.updateChart(this.props.chartId, {
      background: color,
    });
  }

  updateTitle(newTitle: string) {
    const title = { ...this.title, text: newTitle };
    this.props.updateChart(this.props.chartId, { title });
  }

  updateChartTitleStyle(style: TitleDesign) {
    const title = { ...this.title, ...style };
    this.props.updateChart(this.props.chartId, { title });
    this.state.activeTool = "";
  }
}
