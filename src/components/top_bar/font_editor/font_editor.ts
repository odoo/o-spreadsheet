import { signal, useProps } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { DEFAULT_FONT } from "../../../constants";
import { PropsOf } from "../../../types/props_of";
import { getElBoundingRect } from "../../helpers/dom_helpers";
import { ToolBarDropdownStore, useToolBarDropdownStore } from "../../helpers/top_bar_tool_hook";
import { OSComponent } from "../../os_component";
import { Popover } from "../../popover/popover";
import { types } from "../../props_validation";

export class TopBarFontEditor extends OSComponent {
  static template = "o-spreadsheet-TopBarFontEditor";
  static components = { Popover };

  protected props = useProps({
    fontActions: types.array(types.ActionSpec()),
    class: types.string(),
  });

  topBarToolStore!: ToolBarDropdownStore;
  dropdownRef = signal.ref();
  actions: Action[] = this.props.fontActions.map(createAction);

  setup() {
    this.topBarToolStore = useToolBarDropdownStore();
  }

  get currentFont(): string {
    return this.model().getters.getCurrentStyle().font || DEFAULT_FONT;
  }

  get isActive() {
    return this.topBarToolStore.isActive;
  }

  get popoverProps(): PropsOf<Popover> {
    return {
      anchorRect: getElBoundingRect(this.dropdownRef()),
      positioning: "bottom-left",
    };
  }

  toggleDropdown() {
    if (this.isActive) {
      this.topBarToolStore.closeDropdowns();
    } else {
      this.topBarToolStore.openDropdown();
    }
  }

  selectFont(action: Action) {
    action.execute?.(this.spEnv);
    this.topBarToolStore.closeDropdowns();
  }
}
