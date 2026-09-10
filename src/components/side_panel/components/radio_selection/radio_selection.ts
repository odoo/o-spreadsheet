import { useProps } from "@odoo/owl";
import { OSComponent } from "../../../os_component";

import { types } from "../../../props_validation";
interface Choice {
  value: unknown;
  label: string;
}

export class RadioSelection extends OSComponent {
  static template = "o-spreadsheet.RadioSelection";

  protected props = useProps({
    choices: types.ArrayOf<Choice>(),
    onChange: types.function<(value: unknown) => void>(),
    selectedValue: types.string(),
    name: types.string(),
    direction: types
      .or([types.literal("horizontal"), types.literal("vertical")])
      .optional("horizontal"),
  });
}
