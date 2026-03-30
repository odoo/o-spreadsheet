import { parseDateTime } from "@odoo/o-spreadsheet-engine/helpers/dates";
import { formatValue } from "@odoo/o-spreadsheet-engine/helpers/format/format";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef } from "@odoo/owl";

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
    const locale = this.env.model.getters.getLocale();
    const dateValue = parseDateTime(value, locale);
    return dateValue ? formatValue(dateValue.value, { format: "yyyy-mm-dd", locale }) : "";
  }

  onDateInputValueChanged(value: string) {
    const locale = this.env.model.getters.getLocale();
    const dateValue = parseDateTime(value, locale);
    if (dateValue) {
      const formatedValue = formatValue(dateValue.value, { format: locale.dateFormat, locale });
      this.props.onChange(formatedValue);
    }
  }
}
