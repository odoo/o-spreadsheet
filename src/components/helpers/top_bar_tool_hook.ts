import { onWillUnmount } from "@odoo/owl";
import { useComponent } from "../../owl3_compatibility_layer";
import { useStore } from "../../store_engine";
import { TopBarToolStore } from "../top_bar/top_bar_tool_store";

export type ToolBarDropdownStore = ReturnType<typeof useToolBarDropdownStore>;

export function useToolBarDropdownStore() {
  const component = useComponent();
  const topbarStore = useStore(TopBarToolStore);
  onWillUnmount(() => {
    if (component === topbarStore.currentDropdown) {
      topbarStore.closeDropdowns();
    }
  });

  return {
    closeDropdowns: () => topbarStore.closeDropdowns(),
    openDropdown: () => {
      topbarStore.openDropdown(component);
    },
    get isActive() {
      return topbarStore.currentDropdown === component;
    },
  };
}
