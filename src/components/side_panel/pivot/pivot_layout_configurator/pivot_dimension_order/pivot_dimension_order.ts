import { useProps } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
import { _t } from "../../../../../translation";
import { ValueAndLabel } from "../../../../../types/misc";
import { PivotDimension } from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { Select } from "../../../../select/select";

export class PivotDimensionOrder extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionOrder";
  protected props = useProps({
    dimension: types.PivotDimension(),
    onUpdated: types.function<(dimension: PivotDimension, ev: InputEvent) => void>(),
    isMeasureSorted: types.boolean().optional(),
  });
  static components = { Select };

  get orderSelectOptions(): ValueAndLabel[] {
    const options = [
      { value: "asc", label: _t("Ascending") },
      { value: "desc", label: _t("Descending") },
    ];
    if (this.props.isMeasureSorted) {
      options.unshift({ value: "measures", label: _t("Sorted by measure") });
    }
    if (this.props.dimension.type === "date") {
      return options;
    }
    return [{ value: "", label: _t("Unsorted") }, ...options];
  }

  get selectedValue() {
    if (this.props.isMeasureSorted) {
      return "measures";
    }
    return this.props.dimension.order || "";
  }
}
