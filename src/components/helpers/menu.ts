import { MENU_ITEM_HEIGHT, MENU_SEPARATOR_HEIGHT } from "../../constants";
import { MenuItem } from "../../registries";

export function menuComponentHeight(menuItems: MenuItem[]): number {
  const separators = menuItems.filter((m) => m.separator);
  const others = menuItems;
  return MENU_ITEM_HEIGHT * others.length + separators.length * MENU_SEPARATOR_HEIGHT;
}
