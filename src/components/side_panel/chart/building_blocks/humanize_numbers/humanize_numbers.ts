import { _t } from "@odoo/o-spreadsheet-engine";
import { formatLargeNumber, formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { ChartWithDataSetDefinition } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../../common";

export class ChartHumanizeNumbers extends Component<
  ChartSidePanelProps<ChartWithDataSetDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartHumanizeNumbers";
  static components = {
    Checkbox,
  };
  static props = ChartSidePanelPropsObject;

  get title() {
    const locale = this.env.model.getters.getLocale();
    const format = formatLargeNumber({ value: 1234567 }, undefined, locale);
    const value = formatValue({ value: 1234567, format }, locale);
    return _t("E.g. 1234567 -> %(value)s", { value });
  }
}
