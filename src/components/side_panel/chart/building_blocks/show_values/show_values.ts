import { useProps } from "@odoo/owl";
import { ChartDefinitionWithDataSource, ChartStyle } from "../../../../../types/chart/chart";
import { DispatchResult } from "../../../../../types/commands";
import { UID } from "../../../../../types/misc";
import { OSComponent } from "../../../../os_component";
import { types } from "../../../../props_validation";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

export class ChartShowValues extends OSComponent {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
    Section,
    TextStyler,
  };

  protected props = useProps({
    chartId: types.UID(),
    definition: types.ChartDefinitionWithDataSource(),
    canUpdateChart:
      types.function<
        (chartId: UID, definition: Partial<ChartDefinitionWithDataSource<string>>) => DispatchResult
      >(),
    updateChart:
      types.function<
        (chartId: UID, definition: Partial<ChartDefinitionWithDataSource<string>>) => DispatchResult
      >(),
    defaultValue: types.boolean().optional(),
    defaultShowLabels: types.boolean().optional(),
    hasVerticalAlign: types.boolean().optional(),
    showAdvancedOptions: types.boolean().optional(),
    defaultStyle: types.object<ChartStyle>().optional(),
  });

  updateShowData(key: "values" | "percentages" | "labels", value: boolean) {
    const showData = {
      ...this.props.definition.showData,
      [key]: value,
    };
    this.props.updateChart(this.props.chartId, { showData });
  }

  get showValues() {
    return this.props.definition.showData?.values ?? this.props.defaultValue;
  }

  get showLabels() {
    return this.props.definition.showData?.labels ?? this.props.defaultShowLabels;
  }

  updateValuesDesign(valuesDesign: ChartStyle) {
    this.props.updateChart(this.props.chartId, {
      showData: { ...this.props.definition.showData, valuesDesign },
    });
  }
}
