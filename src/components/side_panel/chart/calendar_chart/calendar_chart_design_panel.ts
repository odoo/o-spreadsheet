import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import { LegendPosition } from "../../../../types/chart";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import { Color, SpreadsheetChildEnv } from "../../../../types/index";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { ColorScalePicker } from "../building_blocks/color_scale/color_scale_picker";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

export class CalendarChartDesignPanel extends Component<
  ChartSidePanelProps<CalendarChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-CalendarChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    ChartShowValues,
    ColorScalePicker,
    RoundColorPicker,
  };
  static props = ChartSidePanelPropsObject;

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: "y", name: _t("Vertical axis") },
    ];
  }

  onColormapChange(colorScale): void {
    this.props.updateChart(this.props.chartId, {
      colorScale,
    });
  }

  updateMissingValueColor(color: Color) {
    this.props.updateChart(this.props.chartId, { missingValueColor: color });
  }

  get selectedMissingValueColor() {
    return this.props.definition.missingValueColor;
  }

  updateLegendPosition(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value as LegendPosition;
    this.props.updateChart(this.props.chartId, { legendPosition: value });
  }
}
