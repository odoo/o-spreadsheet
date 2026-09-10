import { useProps } from "@odoo/owl";
import { OSComponent } from "../../../os_component";

import { types } from "../../../props_validation";
interface Choice {
  value: string;
  label: string;
  icon?: string;
}

export class BadgeSelection extends OSComponent {
  static template = "o-spreadsheet.BadgeSelection";

  protected props = useProps({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<(value: string) => void>(),
    selectedValue: types.string(),
  });
}
