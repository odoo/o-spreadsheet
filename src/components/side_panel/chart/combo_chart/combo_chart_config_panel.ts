import { _t } from "../../../../translation";
import { BarConfigPanel } from "../bar_chart/bar_chart_config_panel";

export class ComboConfigPanel extends BarConfigPanel {
  get stackedLabel(): string {
    return _t("Stacked combochart");
  }
}
