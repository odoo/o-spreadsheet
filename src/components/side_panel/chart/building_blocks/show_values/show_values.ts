import { useProps } from "@odoo/owl";
import {
  ChartDefinitionWithDataSource,
  ChartShowValues,
  ChartStyle,
} from "../../../../../types/chart/chart";
import { DispatchResult } from "../../../../../types/commands";
import { UID } from "../../../../../types/misc";
import { OSComponent } from "../../../../os_component";
import { types } from "../../../../props_validation";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { TextStyler } from "../text_styler/text_styler";

export class ChartShowValuesComponent extends OSComponent {
  static template = "o-spreadsheet-ChartShowValuesComponent";
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
    hasVerticalAlign: types.boolean().optional(),
    showLabelCheckbox: types.boolean().optional(),
    showPercentageCheckbox: types.boolean().optional(),
    default: types.object<ChartShowValues>().optional(),
  });

  updateShowData(key: "values" | "percentages" | "labels", value: boolean) {
    const showData = {
      ...this.props.definition.showData,
      [key]: value,
    };
    this.props.updateChart(this.props.chartId, { showData });
  }

  get showValues() {
    return this.props.definition.showData?.values ?? this.props.default?.values;
  }

  get showLabels() {
    return this.props.definition.showData?.labels ?? this.props.default?.labels;
  }

  get showPercentages() {
    return this.props.definition.showData?.percentages ?? this.props.default?.percentages;
  }

  get showStyleEditor(): boolean | undefined {
    return (
      this.showValues ||
      (this.showLabels && this.props.showLabelCheckbox) ||
      (this.showPercentages && this.props.showPercentageCheckbox)
    );
  }

  updateValuesDesign(valuesDesign: ChartStyle) {
    this.props.updateChart(this.props.chartId, {
      showData: { ...this.props.definition.showData, valuesDesign },
    });
  }
}
