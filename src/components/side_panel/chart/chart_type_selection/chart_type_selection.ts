import { Component } from "@odoo/owl";
import { ChartType, SpreadsheetChildEnv, UID } from "../../../../types";

interface Props {
  figureId: UID;
  onTypeChange: (newType: ChartType) => void;
}

export class ChartTypeSelect extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTypeSelect";

  get chartType() {
    return this.env.model.getters.getChartType(this.props.figureId);
  }
}
