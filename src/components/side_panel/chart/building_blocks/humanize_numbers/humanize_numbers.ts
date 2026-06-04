import { props } from "@odoo/owl";
import { formatLargeNumber, formatValue } from "../../../../../helpers/format/format";
import { Component } from "../../../../../owl3_compatibility_layer";
import { _t } from "../../../../../translation";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { useModel } from "../../../../owl_plugins/model_plugin";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

export class ChartHumanizeNumbers extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartHumanizeNumbers";
  static components = {
    Checkbox,
  };
  protected props = props(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;

  private model = useModel();

  get title() {
    const locale = this.model().getters.getLocale();
    const format = formatLargeNumber({ value: 1234567 }, undefined, locale);
    const value = formatValue(1234567, { format, locale });
    return _t("E.g. 1234567 -> %(value)s", { value });
  }
}
