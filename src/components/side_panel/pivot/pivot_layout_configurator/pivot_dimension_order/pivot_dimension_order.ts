import { Component } from "@odoo/owl";
import { PivotDimension } from "../../../../../types/pivot";

<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { _t } from "../../../../../translation";
import { ValueAndLabel } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Select } from "../../../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
=======
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db

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
