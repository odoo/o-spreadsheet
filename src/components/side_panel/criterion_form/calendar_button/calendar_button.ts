import { Component, useRef } from "@odoo/owl";
import { formatValue, parseDateTime } from "../../../../helpers";
import { DEFAULT_LOCALE } from "../../../../types";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export class CalendarButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CalendarButton";
  static props = {
    value: String,
    onChange: Function,
  };
  datePickerRef = useRef<HTMLInputElement>("hiddenDatePicker");

  openCalendar() {
    const dateInput = this.datePickerRef.el;
    if (dateInput && typeof dateInput.showPicker === "function") {
      dateInput.showPicker();
    } else if (dateInput) {
      dateInput.click();
    }
  }

  formatDateForInput(value: string) {
    const dateValue = parseDateTime(value, DEFAULT_LOCALE);
    return dateValue
      ? formatValue(dateValue.value, { format: "yyyy-mm-dd", locale: DEFAULT_LOCALE })
      : "";
  }

  onDateInputValueChanged(value: string) {
    const dateValue = parseDateTime(value, DEFAULT_LOCALE);
    if (dateValue) {
      const formatedValue = formatValue(dateValue.value, {
        format: DEFAULT_LOCALE.dateFormat,
        locale: DEFAULT_LOCALE,
      });
      this.props.onChange(formatedValue);
    }
  }
}
