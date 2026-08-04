import { useProps } from "@odoo/owl";
import { formatTime, formatValue } from "../../../helpers/format/format";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { types } from "../../props_validation";

export class PerfItem extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PerfItem";

  protected props = useProps({
    label: types.string(),
    subLabel: types.string().optional(),
    time: types.number(),
    totalTime: types.number(),
    isSelected: types.boolean(),
    onClick: types.function(),
  });

  formatTime(ms: number): string {
    const locale = this.env.model.getters.getLocale();
    return formatTime(ms, locale);
  }

  formatPercent(time: number): string {
    const total = this.props.totalTime;
    if (!total) {
      return "0.0%";
    }
    return formatValue(time / total, {
      format: "0.0%",
      locale: this.env.model.getters.getLocale(),
    });
  }

  get barWidth(): number {
    return (this.props.time / this.props.totalTime) * 100;
  }
}
