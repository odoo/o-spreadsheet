import { deepCopy } from "../../../../helpers/misc";
import {
  SunburstChartDefaults,
  SunburstChartDefinition,
  SunburstChartJSDataset,
  SunburstChartRuntime,
} from "../../../../types/chart/sunburst_chart";
import { OSComponent } from "../../../os_component";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { Section } from "../../components/section/section";
import { ChartAnnotation } from "../building_blocks/annotation/annotation";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

import { useProps } from "@odoo/owl";
export class SunburstChartDesignPanel extends OSComponent {
  static template = "o-spreadsheet-SunburstChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    ChartAnnotation,
    Section,
    SidePanelCollapsible,
    ChartShowValues,
    Checkbox,
    RoundColorPicker,
    ChartLegend,
    PieHoleSize,
    ChartHumanizeNumbers,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    SunburstChartDefinition<string>
  >;

  defaults = SunburstChartDefaults;

  get showValues() {
    return this.props.definition.showData?.values ?? SunburstChartDefaults.showValues;
  }

  get showLabels() {
    return this.props.definition.showData?.labels ?? SunburstChartDefaults.showLabels;
  }

  get groupColors() {
    const chartId = this.props.chartId;
    const runtime = this.model().getters.getChartRuntime(chartId) as SunburstChartRuntime;
    const dataset = runtime.chartJsConfig.data.datasets[0] as SunburstChartJSDataset;
    return dataset?.groupColors || [];
  }

  onGroupColorChanged(index: number, color: string) {
    const colors = deepCopy(this.props.definition.groupColors) ?? [];
    colors[index] = color;
    this.props.updateChart(this.props.chartId, { groupColors: colors });
  }

  onPieHoleSizeChange(pieHolePercentage: number) {
    this.props.updateChart(this.props.chartId, {
      ...this.props.definition,
      pieHolePercentage,
    });
  }
}
