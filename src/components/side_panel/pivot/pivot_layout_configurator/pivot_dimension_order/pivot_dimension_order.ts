import { PivotDimension } from "@odoo/o-spreadsheet-engine/types/pivot";
import { Component } from "@odoo/owl";

import { _t, ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Select } from "../../../../select/select";

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
