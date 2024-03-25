import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../..";
import { PERIODS } from "../../../../../helpers/pivot/pivot_helpers";
import { PivotDimension } from "../../../../../types/pivot";

interface Props {
  dimension: PivotDimension;
  onUpdated: (dimension: PivotDimension, ev: InputEvent) => void;
  availableGranularities: Set<string>;
}

export class PivotDimensionGranularity extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionGranularity";
  static props = {
    dimension: Object,
    onUpdated: Function,
    availableGranularities: Set,
  };
  periods = PERIODS;
  allGranularities = Object.keys(PERIODS);
}
