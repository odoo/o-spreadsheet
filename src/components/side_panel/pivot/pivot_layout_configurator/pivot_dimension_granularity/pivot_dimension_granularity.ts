import { ALL_PERIODS } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { PivotDimension } from "@odoo/o-spreadsheet-engine/types/pivot";
import { Component } from "@odoo/owl";

import { ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Select } from "../../../../select/select";

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
