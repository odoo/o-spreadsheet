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
  formatNumberFullQuarter,
  formatNumberFullWeekDayAndMonth,
  formatNumberISODate,
  formatNumberISODateTime,
  formatNumberQuarter,
  formatNumberShortMonth,
  formatNumberShortWeekDay,
  formatNumberTime,
} from "../../../actions/format_actions";
import { SpreadsheetChildEnv } from "../../../types";

interface Props {
  onCloseSidePanel: () => void;
}

const DATE_FORMAT_ACTIONS = createActions([
  formatNumberFullDateTime,
  formatNumberISODate,
  formatNumberISODateTime,
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
  formatNumberQuarter,
  formatNumberFullQuarter,
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
