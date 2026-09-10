import { formatLargeNumber, formatValue } from "../../../../../helpers/format/format";
import { _t } from "../../../../../translation";
import { ChartDefinitionWithDataSource } from "../../../../../types/chart/chart";
import { OSComponent } from "../../../../os_component";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../../common";

import { useProps } from "@odoo/owl";
export class ChartHumanizeNumbers extends OSComponent {
  static template = "o-spreadsheet-ChartHumanizeNumbers";
  static components = {
    Checkbox,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    ChartDefinitionWithDataSource<string>
  >;

  get title() {
    const locale = this.env.model.getters.getLocale();
    const format = formatLargeNumber({ value: 1234567 }, undefined, locale);
    const value = formatValue(1234567, { format, locale });
    return _t("E.g. 1234567 -> %(value)s", { value });
  }
}
