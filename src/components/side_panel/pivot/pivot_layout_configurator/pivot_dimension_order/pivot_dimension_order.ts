import { PivotDimension } from "../../../../../types/pivot";

import { _t } from "../../../../../translation";
import { ValueAndLabel } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Select } from "../../../../select/select";

import { Component } from "../../../../../owl3_compatibility_layer";
interface Props {
  dimension: PivotDimension;
  onUpdated: (dimension: PivotDimension, ev: InputEvent) => void;
}

export class PivotDimensionOrder extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionOrder";
  static props = {
    dimension: Object,
    onUpdated: Function,
  };
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
