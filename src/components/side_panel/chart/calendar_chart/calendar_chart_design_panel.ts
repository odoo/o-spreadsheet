import { _t, ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { LegendPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import { CalendarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/calendar_chart";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { Color } from "../../../../types/index";
import { Select } from "../../../select/select";
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
  ChartSidePanelProps<CalendarChartDefinition<string>>,
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
    Select,
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

  updateLegendPosition(value: LegendPosition) {
    this.props.updateChart(this.props.chartId, { legendPosition: value });
  }

  get legendValues(): ValueAndLabel[] {
    return [
      { value: "none", label: _t("None") },
      { value: "right", label: _t("Right") },
      { value: "left", label: _t("Left") },
    ];
  }
}
