import { MenuService } from "../../src/helpers/menu_service";
import { MenuItemRegistry } from "../../src/registries/menu_items_registry";

const testRegistry = new MenuItemRegistry();
testRegistry.add("item", {
  name: "test name",
  description: "test descr",
  sequence: 10,
  action: () => {},
});

describe("Menu Service tests", () => {
  let menuService: MenuService;

  beforeEach(() => {
    menuService = new MenuService();
  });

  test("Can register a menu in the service", () => {
    menuService.registerMenu({
      position: { x: 0, y: 0 },
      menuItems: testRegistry.getMenuItems(),
    });
    expect(menuService.hasOpenMenu()).toBe(true);
  });

  test("Can register a new menu over an existing one ", () => {
    const id = menuService.registerMenu({
      position: { x: 0, y: 0 },
      menuItems: testRegistry.getMenuItems(),
    });
    expect(menuService.getCurrentMenuProps()?.position).toEqual({ x: 0, y: 0 });
    expect(menuService.getCurrentMenuId()).toEqual(id);

    const newId = menuService.registerMenu({
      position: { x: 10, y: 10 },
      menuItems: testRegistry.getMenuItems(),
    });
    expect(menuService.getCurrentMenuProps()?.position).toEqual({ x: 10, y: 10 });
    expect(menuService.getCurrentMenuId()).toEqual(newId);
  });

  test("Closing the menu triggers its onClose", () => {
    const onClose = jest.fn();
    menuService.registerMenu({
      position: { x: 0, y: 0 },
      menuItems: testRegistry.getMenuItems(),
      onClose,
    });
    menuService.closeActiveMenu();
    expect(onClose).toHaveBeenCalled();
  });

  test("Opening a new menu triggers the onClose of the old menu", () => {
    const onClose = jest.fn();
    menuService.registerMenu({
      position: { x: 0, y: 0 },
      menuItems: testRegistry.getMenuItems(),
      onClose,
    });
    menuService.registerMenu({
      position: { x: 10, y: 10 },
      menuItems: testRegistry.getMenuItems(),
    });
    expect(onClose).toHaveBeenCalled();
  });
});
