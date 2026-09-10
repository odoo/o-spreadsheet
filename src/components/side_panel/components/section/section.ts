import { useProps } from "@odoo/owl";
import { OSComponent } from "../../../os_component";

import { types } from "../../../props_validation";

export class Section extends OSComponent {
  static template = "o_spreadsheet.Section";

  protected props = useProps({
    class: types.string().optional(),
    title: types.string().optional(),
    slots: types.object(),
  });
}
