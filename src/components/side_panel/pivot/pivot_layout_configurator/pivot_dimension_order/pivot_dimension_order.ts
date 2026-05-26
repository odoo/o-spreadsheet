import { props } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
import { _t } from "../../../../../translation";
import { ValueAndLabel } from "../../../../../types/misc";
import { PivotDimension } from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { Select } from "../../../../select/select";

export class PivotDimensionOrder extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionOrder";
  protected props = props({
    dimension: types.PivotDimension(),
    onUpdated: types.function<[dimension: PivotDimension, ev: InputEvent]>([
      types.PivotDimension(),
      types.instanceOf(InputEvent),
    ]),
  });
  static components = { Select };

  get orderSelectOptions(): ValueAndLabel[] {
    const options = [
      { value: "asc", label: _t("Ascending") },
      { value: "desc", label: _t("Descending") },
    ];
    if (this.props.dimension.type === "date") {
      return options;
    }
    return [{ value: "", label: _t("Unsorted") }, ...options];
  }
}
