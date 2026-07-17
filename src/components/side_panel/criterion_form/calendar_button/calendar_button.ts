import { signal, useProps } from "@odoo/owl";
import { parseDateTime } from "../../../../helpers/dates";
import { formatValue } from "../../../../helpers/format/format";
import { Component } from "../../../../owl3_compatibility_layer";
import { DEFAULT_LOCALE } from "../../../../types/locale";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";

export class CalendarButton extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CalendarButton";
  protected props = useProps({
    value: types.string().optional(""),
    onChange: types.function<(value: string) => void>(),
  });

  datePickerRef = signal.ref(HTMLInputElement);

  openCalendar() {
    this.datePickerRef()?.showPicker();
  }

  // Both methods use DEFAULT_LOCALE intentionally: the HTML date input speaks ISO 8601,
  // and criterion values are stored in canonical form (m/d/yyyy), regardless of the spreadsheet locale.
  formatDateForInput(value: string) {
    const dateValue = parseDateTime(value, DEFAULT_LOCALE);
    return dateValue
      ? formatValue(dateValue.value, { format: "yyyy-mm-dd", locale: DEFAULT_LOCALE })
      : "";
  }

  onDateInputValueChanged(value: string) {
    const dateValue = parseDateTime(value, DEFAULT_LOCALE);
    const formattedValue = dateValue
      ? formatValue(dateValue.value, {
          format: DEFAULT_LOCALE.dateFormat,
          locale: DEFAULT_LOCALE,
        })
      : "";
    this.props.onChange(formattedValue);
  }
}
