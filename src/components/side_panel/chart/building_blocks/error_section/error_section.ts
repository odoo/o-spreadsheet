import { useProps } from "@odoo/owl";
import { OSComponent } from "../../../../os_component";
import { Section } from "../../../components/section/section";

import { types } from "../../../../props_validation";
import { ValidationMessages } from "../../../../validation_messages/validation_messages";
export class ChartErrorSection extends OSComponent {
  static template = "o-spreadsheet.ChartErrorSection";
  static components = { Section, ValidationMessages };

  protected props = useProps({
    messages: types.array(types.string()),
  });
}
