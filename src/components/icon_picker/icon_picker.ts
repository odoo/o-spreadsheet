import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { ICONS, ICON_SETS } from "../icons/icons";

import { Component } from "../../owl3_compatibility_layer";
interface Props {
  onIconPicked: (icon: string) => void;
}

export class IconPicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-IconPicker";
  static props = {
    onIconPicked: Function,
  };

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
