import { onWillUnmount, onWillUpdateProps, useComponent } from "@odoo/owl";
import { OpenMenuArgs } from "../../helpers/menu_service";
import { SpreadsheetChildEnv, UID } from "../../types";

export interface MenuInterface {
  open(menu: OpenMenuArgs): void;
  close(): void;
  closeAny(): void;
  toggle(menu: OpenMenuArgs): void;
  hasOpenMenu(): boolean;
}

export function useMenu(): MenuInterface {
  const env = useComponent().env as SpreadsheetChildEnv;
  const menuService = env.menuService;
  let openMenu: UID | undefined = undefined;
  onWillUnmount(() => {
    menuService.closeMenu(openMenu);
  });
  onWillUpdateProps(() => {
    if (menuService.getCurrentMenuId() !== openMenu) {
      openMenu = undefined;
    }
  });
  return {
    open(menu: OpenMenuArgs) {
      openMenu = menuService.openMenu(menu);
    },
    close() {
      menuService.closeMenu(openMenu);
      openMenu = undefined;
    },
    closeAny() {
      menuService.closeActiveMenu();
      openMenu = undefined;
    },
    toggle(menu: OpenMenuArgs) {
      if (openMenu && menuService.getCurrentMenuId() === openMenu) {
        menuService.closeMenu(openMenu);
        openMenu = undefined;
      } else {
        openMenu = menuService.openMenu(menu);
      }
    },
    hasOpenMenu() {
      return menuService.hasOpenMenu();
    },
  };
}
