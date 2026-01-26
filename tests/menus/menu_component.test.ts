import { createActions } from "../../src/actions/action";
import { Menu } from "../../src/components/menu/menu";
import { MenuPopover } from "../../src/components/menu_popover/menu_popover";
import { simulateClick } from "../test_helpers/dom_helper";
import { mountComponent, mountComponentWithPortalTarget } from "../test_helpers/helpers";

describe("Menu component", () => {
  test("Execute is not called when menu item is disabled", async () => {
    const callback = jest.fn();
    const menuItems = createActions([
      {
        id: "test_menu",
        name: "Test Menu",
        isEnabled: () => false,
      },
    ]);

    const selector = ".o-menu div[data-name='test_menu']";
    const { fixture } = await mountComponent(Menu, {
      props: { menuItems, onClose: () => {}, onClickMenu: () => callback() },
    });

    expect(fixture.querySelector(selector)!.classList).toContain("disabled");
    await simulateClick(selector);
    expect(callback).not.toHaveBeenCalled();
  });

  test("Opening a menu popover with no visible menu items does not open a popover", async () => {
    const menuItems = createActions([
      { name: "Test Menu", id: "test_menu", isVisible: () => false },
    ]);

    await mountComponentWithPortalTarget(MenuPopover, {
      props: {
        menuItems,
        onClose: () => {},
        anchorRect: { x: 0, y: 0, width: 0, height: 0 },
        popoverPositioning: "bottom-left",
        depth: 0,
      },
    });

    expect(".o-popover").toHaveCount(0);
  });
});
