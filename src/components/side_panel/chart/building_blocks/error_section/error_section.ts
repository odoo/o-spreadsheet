import { useProps } from "@odoo/owl";
import { Section } from "../../../components/section/section";

import { types } from "../../../../props_validation";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";
import { ValidationMessages } from "../../../../validation_messages/validation_messages";
export class ChartErrorSection extends SpreadsheetComponent {
  static template = "o-spreadsheet.ChartErrorSection";
  static components = { Section, ValidationMessages };

  protected props = useProps({
    messages: types.array(types.string()),
  });
}
