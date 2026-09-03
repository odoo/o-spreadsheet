import { ICONS, ICON_SETS } from "../icons/icons";
import { OSComponent } from "../os_component";

import { useProps } from "@odoo/owl";
import { types } from "../props_validation";

export class IconPicker extends OSComponent {
  static template = "o-spreadsheet-IconPicker";

  protected props = useProps({
    onIconPicked: types.function<(icon: string) => void>(),
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
