import { _t } from "@odoo/o-spreadsheet-engine";
import { formatLargeNumber, formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition, DispatchResult, UID } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";

interface Props {
  chartId: UID;
  definition: ChartWithDataSetDefinition;
  updateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
  canUpdateChart: (chartId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class ChartHumanizeNumbers extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartHumanizeNumbers";
  static components = {
    Checkbox,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
  };

  get title() {
    const locale = this.env.model.getters.getLocale();
    const format = formatLargeNumber({ value: 1234567 }, undefined, locale);
    const value = formatValue(1234567, { format, locale });
    return _t("E.g. 1234567 -> %(value)s", { value });
  }
}
