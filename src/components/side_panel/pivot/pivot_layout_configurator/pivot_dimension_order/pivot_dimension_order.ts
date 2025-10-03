import { PivotDimension } from "@odoo/o-spreadsheet-engine/types/pivot";
import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types";

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
