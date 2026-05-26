import { formatLargeNumber, formatValue } from "../../../../../helpers/format/format";
import { _t } from "../../../../../translation";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

import { props } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
export class ChartHumanizeNumbers extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartHumanizeNumbers";
  static components = {
    Checkbox,
  };
  protected props = props(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;

  get title() {
    const locale = this.env.model.getters.getLocale();
    const format = formatLargeNumber({ value: 1234567 }, undefined, locale);
    const value = formatValue(1234567, { format, locale });
    return _t("E.g. 1234567 -> %(value)s", { value });
  }
}
