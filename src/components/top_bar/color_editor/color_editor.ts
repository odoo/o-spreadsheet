import { Component, useState } from "@odoo/owl";
import { setStyle } from "../../../actions/menu_items_actions";
import { _t } from "../../../translation";
import { Pixel, SpreadsheetChildEnv } from "../../../types";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { useToolBarToolStore } from "../../helpers/top_bar_tool_hook";

type Props = {
  style: "textColor" | "fillColor";
  icon: string;
};

export class TopBarColorEditor extends Component<Props, SpreadsheetChildEnv> {
  static components = { ColorPickerWidget };
  static props = { class: String, style: String, icon: String };

  static template = "o-spreadsheet-ColorEditor";
  topBarToolStore!: ReturnType<typeof useToolBarToolStore>;

  state = useState({
    isOpen: false,
  });

  setup() {
    this.topBarToolStore = useToolBarToolStore();
  }
  get currentColor(): string {
    return (
      this.env.model.getters.getCurrentStyle()[this.props.style] ||
      (this.props.style === "textColor" ? "#000000" : "#ffffff")
    );
  }

  get textColor(): string {
    throw new Error("Implement the in the child component");
  }

  setColor(color: string) {
    setStyle(this.env, { [this.props.style]: color });
    this.state.isOpen = false;
  }

  get dropdownMaxHeight(): Pixel {
    return this.env.model.getters.getSheetViewDimension().height;
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

export class TopBarTextColorEditor extends TopBarColorEditor {
  get textColor() {
    return _t("Text Color");
  }
}

export class TopBarFillColorEditor extends TopBarColorEditor {
  get textColor() {
    return _t("Fill Color");
  }
}
