import { onWillUnmount, useComponent } from "@odoo/owl";
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

  const openDropdown = () => {
    topbarStore.openDropdown(component);
  };

  const isActive = () => {
    return topbarStore.currentDropdown === component;
  };

  return {
    closeDropdowns: () => topbarStore.closeDropdowns(),
    openDropdown,
    get isActive() {
      return isActive();
    },
  };
}
