import { MenuProps } from "../components/menu/menu";
import { UID } from "../types";
import { UuidGenerator } from "./uuid";

interface RegisterMenuArgs extends Omit<MenuProps, "onClose" | "depth"> {
  onClose?: () => void;
}

interface InternalMenu extends RegisterMenuArgs {
  id: string;
}

export class MenuService {
  private uuidGenerator = new UuidGenerator();

  private activeMenu: InternalMenu | undefined;

  constructor() {}

  registerMenu(menu: RegisterMenuArgs): UID {
    if (this.activeMenu) {
      this.activeMenu.onClose?.();
    }

    const id = this.uuidGenerator.uuidv4();
    const newMenu = {
      ...menu,
      id,
    };
    this.activeMenu = newMenu;

    return newMenu.id;
  }

  getCurrentMenuId(): UID | undefined {
    return this.activeMenu?.id;
  }

  getCurrentMenuProps(): MenuProps | undefined {
    if (!this.activeMenu) return undefined;
    const menu = this.activeMenu;
    const props: MenuProps = {
      ...menu,
      depth: 1,
      onClose: () => {
        if (this.activeMenu?.id === menu.id) this.activeMenu = undefined;
        menu.onClose?.();
      },
    };
    delete props["id"];
    return props;
  }

  hasOpenMenu(): boolean {
    return !!this.activeMenu;
  }

  unregisterMenu(id: string | undefined) {
    if (id && this.activeMenu?.id === id) {
      // call onClose after setting activeMenu to undefined to avoid possible infinite recursion
      const onClose = this.activeMenu.onClose;
      this.activeMenu = undefined;
      onClose?.();
    }
  }

  closeActiveMenu() {
    if (!this.activeMenu) return;
    this.unregisterMenu(this.activeMenu.id);
  }
}
