import { useProps } from "@odoo/owl";
import { formatTime, formatValue } from "../../../helpers/format/format";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";

export class PerfItem extends OSComponent {
  static template = "o-spreadsheet-PerfItem";

  protected props = useProps({
    label: types.string(),
    subLabel: types.string().optional(),
    time: types.number(),
    totalTime: types.number(),
    isSelected: types.boolean(),
    displayPercentage: types.boolean(),
    onClick: types.function(),
  });

  formatTime(ms: number): string {
    const locale = this.model().getters.getLocale();
    return formatTime(ms, locale);
  }

  formatPercent(time: number): string {
    const total = this.props.totalTime;
    if (!total) {
      return "0.0%";
    }
    return formatValue(time / total, {
      format: "0.0%",
      locale: this.model().getters.getLocale(),
    });
  }

  get barWidth(): number {
    return (this.props.time / this.props.totalTime) * 100;
  }
}
