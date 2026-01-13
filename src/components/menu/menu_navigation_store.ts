import { SpreadsheetStore } from "../../stores/spreadsheet_store";

type NavigationCallback = (key: string) => "eventHandled" | "notHandled";

interface MenuInterface {
  id: string;
  navigationCallback: NavigationCallback;
}

export class MenuNavigationStore extends SpreadsheetStore {
  mutators = ["registerMenu", "onNavigationKey", "unregisterMenu"] as const;

  private menus: MenuInterface[] = [];

  registerMenu(menuId: string, depth: number, navigationCallback: NavigationCallback) {
    if (depth === this.menus.length) {
      this.menus.push({ id: menuId, navigationCallback });
    } else {
      depth = Math.min(depth, this.menus.length - 1);
      this.menus[depth].navigationCallback("closeChildren");
      this.menus = this.menus.slice(0, depth).concat({ id: menuId, navigationCallback });
    }
    console.log("registerMenu", menuId, depth, this.menus);
  }

  unregisterMenu(menuId: string) {
    const menuIndex = this.menus.findIndex((menu) => menu.id === menuId);
    if (menuIndex === -1) {
      console.log("unregisterMenu not found", menuId, this.menus);
      return;
    }
    this.menus = this.menus.slice(0, menuIndex);
    console.log("unregistered", menuId, this.menus);
  }

  onNavigationKey(key: string) {
    if (this.menus.length === 0) {
      return;
    }
    for (let i = this.menus.length - 1; i >= 0; i--) {
      const result = this.menus[i].navigationCallback(key);
      if (result === "eventHandled") {
        break;
      }
    }
  }

  get handledKeys(): string[] {
    return ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape", "Enter"];
  }
}
