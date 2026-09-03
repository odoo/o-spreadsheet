import { useProps } from "@odoo/owl";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_VALUES } from "../../../constants";
import { useStore } from "../../../store_engine/store_hooks";
import { ZoomStore } from "../../../stores/zoom_store";
import { Store } from "../../../types/store_engine";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { NumberEditor } from "../../number_editor/number_editor";
import { OSComponent } from "../../os_component";
import { types } from "../../props_validation";

export class ToolBarZoom extends OSComponent {
  static template = "o-spreadsheet-TopBarZoom";
  static components = { NumberEditor };

  protected props = useProps({ class: types.string() });
  topBarToolStore!: ToolBarDropdownStore;
  private zoomStore!: Store<ZoomStore>;

  valueList = ZOOM_VALUES;
  minZoom = MIN_ZOOM * 100;
  maxZoom = MAX_ZOOM * 100;

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
    this.zoomStore = useStore(ZoomStore);
  }

  getZoomLevel(): number {
    const zoom = this.zoomStore.zoomLevel || 1;
    return Math.round(zoom * 100);
  }

  setZoom(zoomPercentage: number) {
    this.zoomStore.setZoom(zoomPercentage / 100);
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
