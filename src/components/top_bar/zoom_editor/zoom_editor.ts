import { useProps } from "@odoo/owl";
import { ZOOM_VALUES } from "../../../constants";
import { Component } from "../../../owl3_compatibility_layer";
import { useStore } from "../../../store_engine/store_hooks";
import { ViewportsStore } from "../../../stores/viewports_store";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Store } from "../../../types/store_engine";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { NumberEditor } from "../../number_editor/number_editor";
import { types } from "../../props_validation";

export class ToolBarZoom extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { NumberEditor };

  protected props = useProps({ class: types.string() });
  topBarToolStore!: ToolBarDropdownStore;
  private viewStore!: Store<ViewportsStore>;

  valueList = ZOOM_VALUES;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
    this.viewStore = useStore(ViewportsStore);
  }

  get currentFontSize(): number {
    const zoom = this.viewStore.zoomLevel || 1;
    return zoom * 100;
  }

  setZoom(fontSize: number) {
    this.viewStore.setZoom(fontSize / 100);
  }

  toggle() {
    if (this.topBarToolStore.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      this.topBarToolStore.openDropdown();
    }
  }

  onFocusInput() {
    this.topBarToolStore.openDropdown();
  }
}
