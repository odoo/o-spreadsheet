import { useProps } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";

import { Component } from "../../../../owl3_compatibility_layer";
import { types } from "../../../props_validation";

export class Section extends Component<SpreadsheetChildEnv> {
  static template = "o_spreadsheet.Section";

  protected props = useProps({
    class: types.string().optional(),
    title: types.string().optional(),
    slots: types.object(),
  });
}
