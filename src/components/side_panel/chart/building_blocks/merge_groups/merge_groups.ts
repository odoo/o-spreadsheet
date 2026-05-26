import { hasMultipleLabelRanges } from "../../../../../helpers/figures/charts/chart_common";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

import { useProps } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
export class ChartMergeGroups extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartMergeGroups";
  static components = {
    Checkbox,
    Section,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;

  get hasMultipleLabelRanges(): boolean {
    return hasMultipleLabelRanges(this.props.definition);
  }
}
