import { Component } from "@odoo/owl";
import { ALL_PERIODS } from "../../../../../helpers/pivot/pivot_helpers";
import { PivotDimension } from "../../../../../types/pivot";

import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";

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
  periods = ALL_PERIODS;
}
