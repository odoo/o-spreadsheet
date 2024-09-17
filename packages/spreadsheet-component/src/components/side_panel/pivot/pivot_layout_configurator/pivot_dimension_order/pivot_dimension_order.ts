import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";
import { PivotDimension } from "../../../../../types/pivot";

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
}
