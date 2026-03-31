import { Component } from "@odoo/owl";
import { ALL_PERIODS } from "../../../../../helpers/pivot/pivot_helpers";
import { PivotDimension } from "../../../../../types/pivot";

<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
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
  availableGranularities: Set<string>;
  allGranularities: string[];
}

export class PivotDimensionGranularity extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionGranularity";
  static props = {
    dimension: Object,
    onUpdated: Function,
    availableGranularities: Set,
    allGranularities: Array,
  };
  static components = { Select };
  periods = ALL_PERIODS;

  get granularityOptions(): ValueAndLabel[] {
    const propsGranularity = this.props.dimension.granularity || "month";
    return this.props.allGranularities
      .filter(
        (granularity) =>
          this.props.availableGranularities.has(granularity) || granularity === propsGranularity
      )
      .map((granularity) => ({
        value: granularity,
        label: this.periods[granularity],
      }));
  }
}
