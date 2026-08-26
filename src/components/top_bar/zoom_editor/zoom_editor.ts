import { useProps } from "@odoo/owl";
import { ZOOM_VALUES } from "../../../constants";
import { useStore } from "../../../store_engine/store_hooks";
import { ZoomStore } from "../../../stores/zoom_store";
import { Store } from "../../../types/store_engine";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { NumberEditor } from "../../number_editor/number_editor";
import { types } from "../../props_validation";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";

export class ToolBarZoom extends SpreadsheetComponent {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { NumberEditor };

  protected props = useProps({ class: types.string() });
  topBarToolStore!: ToolBarDropdownStore;
  private zoomStore!: Store<ZoomStore>;

  valueList = ZOOM_VALUES;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
    this.zoomStore = useStore(ZoomStore);
  }

  get currentFontSize(): number {
    const zoom = this.zoomStore.zoomLevel || 1;
    return zoom * 100;
  }

  setZoom(fontSize: number) {
    this.zoomStore.setZoom(fontSize / 100);
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
