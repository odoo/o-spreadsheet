import { props } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Section } from "../../../components/section/section";

import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";
import { ValidationMessages } from "../../../../validation_messages/validation_messages";
export class ChartErrorSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartErrorSection";
  static components = { Section, ValidationMessages };

  protected props = props({
    messages: types.array(types.string()),
  });
}
