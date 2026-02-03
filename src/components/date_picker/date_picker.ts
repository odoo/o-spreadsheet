import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { DateTime } from "luxon";
import { Popover, PopoverProps } from "../popover";
import { Pixel } from "@odoo/o-spreadsheet-engine";

interface Props {
  onDatePicked: (date: DateTime) => void;
  initialDate?: DateTime;
  anchorRect: DOMRect;
  maxHeight?: Pixel;
}

interface State {
  viewDate: DateTime;
  selectedDate: DateTime;
}

export class DatePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DatePicker";
  static components = {Popover};
  static props = {
    onDatePicked: Function,
    initialDate: { type: Object, optional: true },
    anchorRect: Object,
    maxHeight: { type: Number, optional: true },
  };

  private state: State = useState({
    viewDate: this.props.initialDate || DateTime.now(),
    selectedDate: this.props.initialDate || DateTime.now(),
  });

  get days() {
    const startOfMonth = this.state.viewDate.startOf("month");
    const endOfMonth = this.state.viewDate.endOf("month");
    const startOfWeek = startOfMonth.startOf("week");
    const endOfWeek = endOfMonth.endOf("week");

    const days: DateTime[] = [];
    let day = startOfWeek;
    while (day <= endOfWeek) {
      days.push(day);
      day = day.plus({ days: 1 });
    }
    return days;
  }

  get weekDays() {
    // luxon week starts on Monday = 1
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    return days;
  }

  prevMonth() {
    this.state.viewDate = this.state.viewDate.minus({ months: 1 });
  }

  nextMonth() {
    this.state.viewDate = this.state.viewDate.plus({ months: 1 });
  }

  selectDate(date: DateTime) {
    this.state.selectedDate = date;
    this.props.onDatePicked(date);
  }

  isSameDay(d1: DateTime, d2: DateTime) {
    return d1.hasSame(d2, "day") && d1.hasSame(d2, "month") && d1.hasSame(d2, "year");
  }

  isCurrentMonth(date: DateTime) {
    return date.hasSame(this.state.viewDate, "month") && date.hasSame(this.state.viewDate, "year");
  }

  get today() {
    return DateTime.now();
  }

  get popoverProps(): PopoverProps {
      return {
        anchorRect: this.props.anchorRect,
        maxHeight: this.props.maxHeight,
        positioning: "bottom-left",
        verticalOffset: 0,
      };
    }
}
