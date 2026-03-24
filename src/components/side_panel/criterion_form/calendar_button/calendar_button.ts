import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef } from "@odoo/owl";
import { Props } from "../../pivot/pivot_custom_groups_collapsible/pivot_custom_groups_collapsible";

export class CalendarButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CalendarButton";
  static props = {
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
}
