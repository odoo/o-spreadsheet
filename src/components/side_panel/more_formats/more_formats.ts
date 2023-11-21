import { Component } from "@odoo/owl";
import { createActions } from "../../../actions/action";
import {
  formatNumberDate,
  formatNumberDateTime,
  formatNumberDayAndFullMonth,
  formatNumberDayAndShortMonth,
  formatNumberDuration,
  formatNumberFullDateTime,
  formatNumberFullMonth,
  formatNumberFullWeekDayAndMonth,
  formatNumberShortMonth,
  formatNumberShortWeekDay,
  formatNumberTime,
} from "../../../actions/format_actions";
import { SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers";

interface Props {
  onCloseSidePanel: () => void;
}

css/* scss */ `
  .o-more-formats-panel {
    .format-preview {
      height: 48px;
      background-color: white;

      &:hover {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
    .check-icon {
      width: 24px;
    }
  }
`;

const DATE_FORMAT_ACTIONS = createActions([
  formatNumberFullDateTime,
  formatNumberFullWeekDayAndMonth,
  formatNumberDayAndFullMonth,
  formatNumberShortWeekDay,
  formatNumberDayAndShortMonth,
  formatNumberFullMonth,
  formatNumberShortMonth,
  formatNumberDate,
  formatNumberTime,
  formatNumberDateTime,
  formatNumberDuration,
]);

export class MoreFormatsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-MoreFormatsPanel";
  static props = {
    onCloseSidePanel: Function,
  };

  get dateFormatsActions() {
    return DATE_FORMAT_ACTIONS;
  }
}
