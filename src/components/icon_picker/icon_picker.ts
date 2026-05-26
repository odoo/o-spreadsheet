import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { ICONS, ICON_SETS } from "../icons/icons";

import { props } from "@odoo/owl";
import { Component } from "../../owl3_compatibility_layer";
import { types } from "../props_validation";

export class IconPicker extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-IconPicker";

  protected props = props({
    onIconPicked: types.function<[icon: string]>([types.string()]),
  });

  onIconClick(icon: string) {
    if (icon) {
      this.props.onIconPicked(icon);
    }
  }

  getIconName(iconSet: "arrows" | "smiley" | "dots", iconType: "good" | "neutral" | "bad") {
    return ICON_SETS[iconSet][iconType];
  }

  getIconTemplate(icon: string) {
    return `o-spreadsheet-Icon.${ICONS[icon].template}`;
  }
}
