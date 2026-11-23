import { onWillUnmount, usePlugin } from "@odoo/owl";
import { useComponent } from "../../owl3_compatibility_layer";
import { TopBarToolPlugin } from "../top_bar/top_bar_tool_store";

export type ToolBarDropdownPlugin = ReturnType<typeof useToolBarDropdownPlugin>;

export function useToolBarDropdownPlugin() {
  const component = useComponent();

  const topbarPlugin = usePlugin(TopBarToolPlugin);
  onWillUnmount(() => {
    if (component === topbarPlugin.currentDropdown()) {
      topbarPlugin.closeDropdowns();
    }
  });

  return {
    closeDropdowns: () => topbarPlugin.closeDropdowns(),
    openDropdown: () => {
      topbarPlugin.openDropdown(component);
    },
    get isActive() {
      return topbarPlugin.currentDropdown() === component;
    },
  };
}
