import { useProps } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { DEFAULT_FONT } from "../../../constants";
import { Font } from "../../../types/misc";
import { FontEditor } from "../../font_editor/font_editor";
import { ToolBarDropdownPlugin, useToolBarDropdownPlugin } from "../../helpers/top_bar_tool_hook";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";

export class TopBarFontEditor extends OSComponent {
  static template = "o-spreadsheet-TopBarFontEditor";
  static components = { FontEditor };

  protected props = useProps({ class: types.string() });
  topBarToolPlugin!: ToolBarDropdownPlugin;

  setup() {
    this.topBarToolPlugin = useToolBarDropdownPlugin();
  }

  get currentFont(): string {
    return this.model().getters.getCurrentStyle().font || DEFAULT_FONT;
  }

  get isActive() {
    return this.topBarToolPlugin.isActive;
  }

  get class() {
    const disabled = this.model().getters.isCurrentSheetLocked() ? "o-disabled" : "";
    return `${this.props.class} o-topbar-font-editor-button ${disabled}`;
  }

  toggleDropdown() {
    if (this.isActive) {
      this.topBarToolPlugin.closeDropdowns();
    } else {
      this.topBarToolPlugin.openDropdown();
    }
  }

  setFont(font: Font) {
    setStyle(this.model(), { font });
    this.topBarToolPlugin.closeDropdowns();
  }
}
