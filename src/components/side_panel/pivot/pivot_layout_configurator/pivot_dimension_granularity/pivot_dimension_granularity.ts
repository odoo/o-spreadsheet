import { ALL_PERIODS } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { PivotDimension } from "@odoo/o-spreadsheet-engine/types/pivot";
import { Component } from "@odoo/owl";

import { SpreadsheetChildEnv } from "../../../../../types/spreadsheetChildEnv";

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
