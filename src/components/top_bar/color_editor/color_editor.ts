import { props, proxy } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { Component } from "../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";

export class TopBarColorEditor extends Component<SpreadsheetChildEnv> {
  static components = { ColorPickerWidget };
  static template = "o-spreadsheet-ColorEditor";

  protected props = props({
    class: types.string(),
    style: types.or([types.literal("textColor"), types.literal("fillColor")]),
    icon: types.string(),
    title: types.string(),
  });
  topBarToolStore!: ToolBarDropdownStore;

  state = proxy({
    isOpen: false,
  });

  private model = useModel();
  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }
  get currentColor(): string {
    return (
      this.model().getters.getCurrentStyle()[this.props.style] ||
      (this.props.style === "textColor" ? "#000000" : "#ffffff")
    );
  }

  setColor(color: string) {
    setStyle(this.model(), { [this.props.style]: color });
    this.state.isOpen = false;
  }

  get isMenuOpen(): boolean {
    return this.topBarToolStore.isActive;
  }

  onClick() {
    if (!this.isMenuOpen) {
      this.topBarToolStore.openDropdown();
    } else {
      this.topBarToolStore.closeDropdowns();
    }
  }
}
