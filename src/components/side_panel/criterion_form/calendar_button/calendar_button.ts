import { props, signal } from "@odoo/owl";
import { parseDateTime } from "../../../../helpers/dates";
import { formatValue } from "../../../../helpers/format/format";
import { Component } from "../../../../owl3_compatibility_layer";
import { DEFAULT_LOCALE } from "../../../../types/locale";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";

export class CalendarButton extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CalendarButton";
  protected props = props({
    value: types.string(),
    onChange: types.function<[value: string]>([types.string()]),
  });

  datePickerRef = signal<HTMLInputElement | null>(null);

  openCalendar() {
    const dateInput = this.datePickerRef();
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
