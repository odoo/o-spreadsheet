import { Component } from "@odoo/owl";
import { BACKGROUND_HEADER_COLOR } from "../../../../constants";
import { Figure, SpreadsheetChildEnv } from "../../../../types/index";
import { css } from "../../../helpers/css";
import { BasicChartPanel } from "../basic_chart_panel/basic_chart_panel";
import { ScorecardChartPanel } from "../scorecard_chart_panel/scorecard_chart_panel";

css/* scss */ `
  .o-chart {
    .o-panel {
      display: flex;
      .o-panel-element {
        flex: 1 0 auto;
        padding: 8px 0px;
        text-align: center;
        cursor: pointer;
        border-right: 1px solid darkgray;
        &.inactive {
          background-color: ${BACKGROUND_HEADER_COLOR};
          border-bottom: 1px solid darkgray;
        }
        .fa {
          margin-right: 4px;
        }
      }
      .o-panel-element:last-child {
        border-right: none;
      }
    }

    .o-with-color-picker {
      position: relative;
    }
    .o-with-color-picker > span {
      border-bottom: 4px solid;
    }
  }
`;

interface Props {
  figure: Figure;
  onCloseSidePanel: () => void;
}

export class ChartPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartPanel";
  static components = { BasicChartPanel, ScorecardChartPanel };

  get chartType() {
    return this.env.model.getters.getChartType(this.props.figure.id);
  }
}
