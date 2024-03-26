import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../..";
import { PERIODS } from "../../../../../helpers/pivot/pivot_helpers";
import { PivotDimension } from "../../../../../types/pivot";

interface Props {
  dimension: PivotDimension;
  onUpdated: (dimension: PivotDimension, ev: InputEvent) => void;
  granularities: Set<string>;
}

// @ts-ignore TODOPRO Remove it when https://github.com/odoo/owl/pull/1599 is merged
export class PivotDimensionGranularity extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionGranularity";
  static props = {
    dimension: Object,
    onUpdated: Function,
    granularities: Set,
  };
  periods = PERIODS;
  allGranularities = ["year", "quarter", "month", "week", "day"];
}
