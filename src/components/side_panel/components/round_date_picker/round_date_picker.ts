import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { DateTime } from "luxon";
import { jsDateToNumber, numberToJsDate } from "../../../../helpers";
import { Rect } from "../../../../types";
import { DatePicker } from "../../../date_picker/date_picker";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { Section } from "../section/section";
import { DateTime as DT } from "../../../../helpers";

interface State {
  pickerOpened: boolean;
}

interface Props {
  date?: number;
  onDatePicked: (date: number) => void;
  title?: string;
}

export class RoundDatePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.RoundDatePicker";
  static components = { Section, DatePicker };
  static props = {
    date: { type: Number, optional: true },
    title: { type: String, optional: true },
    onDatePicked: Function,
  };

  datePickerButtonRef = useRef("datePickerButton");

  private state!: State;

  setup() {
    this.state = useState({ pickerOpened: false });
    useExternalListener(window as any, "click", this.closePicker);
  }

  closePicker() {
    this.state.pickerOpened = false;
  }

  togglePicker() {
    this.state.pickerOpened = !this.state.pickerOpened;
  }

  onDatePicked(date: DateTime) {
    this.props.onDatePicked(this.toSpreadsheetDate(date));
    this.state.pickerOpened = false;
  }

  toSpreadsheetDate(date: DateTime): number {
    return Math.floor(jsDateToNumber(DT.fromTimestamp(date.ts)));
  }

  get datePickerAnchorRect(): Rect {
    const button = this.datePickerButtonRef.el!;
    return getBoundingRectAsPOJO(button);
  }

  get initialDate(): DateTime | undefined {
    if (this.props.date) {
      const jsDate = numberToJsDate(this.props.date);
      return DateTime.fromJSDate(jsDate.getJsDate());
    }
    return undefined;
  }
}
