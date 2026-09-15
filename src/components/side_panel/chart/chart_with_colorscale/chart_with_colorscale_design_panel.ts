import { _t } from "../../../../translation";
import { LegendPosition } from "../../../../types/chart/common_chart";
import { Color, ValueAndLabel } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Select } from "../../../select/select";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartAnnotation } from "../building_blocks/annotation/annotation";
import { ColorScalePicker } from "../building_blocks/color_scale/color_scale_picker";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

import { useProps } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { ChartWithColorScaleDefinition } from "../../../../types/chart/chart";

export abstract class ChartWithColorScaleDesignPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartWithColorScaleDesignPanel";
  static components = {
    GeneralDesignEditor,
    ChartAnnotation,
    SidePanelCollapsible,
    Section,
    ChartShowValues,
    ColorScalePicker,
    RoundColorPicker,
    Select,
  };
  protected props = useProps(
    chartSidePanelPropsDefinition
  ) as unknown as ChartSidePanelProps<ChartWithColorScaleDefinition>;

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
      { value: "top", label: _t("Top left") },
      { value: "right", label: _t("Top right") },
      { value: "bottom", label: _t("Bottom right") },
      { value: "left", label: _t("Bottom left") },
    ];
  }
}
