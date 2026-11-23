import { useProps } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { DEFAULT_FONT_SIZE } from "../../../constants";
import { FontSizeEditor } from "../../font_size_editor/font_size_editor";
import { ToolBarDropdownPlugin, useToolBarDropdownPlugin } from "../../helpers/top_bar_tool_hook";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";

export class TopBarFontSizeEditor extends OSComponent {
  static components = { FontSizeEditor };
  static template = "o-spreadsheet-TopBarFontSizeEditor";

  protected props = useProps({ class: types.string() });
  topBarToolPlugin!: ToolBarDropdownPlugin;

  setup() {
    this.topBarToolPlugin = useToolBarDropdownPlugin();
  }

  get currentFontSize(): number {
    return this.model().getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  }
  setFontSize(fontSize: number) {
    setStyle(this.model(), { fontSize });
  }

  onToggle() {
    if (this.isActive) {
      this.topBarToolPlugin.closeDropdowns();
    } else {
      this.topBarToolPlugin.openDropdown();
    }
  }

  onFocusInput() {
    this.topBarToolPlugin.openDropdown();
  }

  get isActive() {
    return this.topBarToolPlugin.isActive;
  }

  get class() {
    return `${this.props.class} ${this.model().getters.isCurrentSheetLocked() ? "o-disabled" : ""}`;
  }
}
