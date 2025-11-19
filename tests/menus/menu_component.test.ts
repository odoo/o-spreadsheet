import { Model } from "@odoo/o-spreadsheet-engine";
import { createActions } from "../../src/actions/action";
import { Menu } from "../../src/components/menu/menu";
import { simulateClick } from "../test_helpers/dom_helper";
import { mountComponent } from "../test_helpers/helpers";

describe("Menu component", () => {
  test("Execute is not called when menu item is disabled", async () => {
    const callback = jest.fn();
    const menuItems = createActions([
      {
        id: "test_menu",
        name: "Test Menu",
        isEnabled: () => false,
        execute: () => {},
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

  test("Execute is not called when menu item is ont readonly allowed", async () => {
    const callback = jest.fn();
    const menuItems = createActions([
      {
        id: "test_menu",
        name: "Test Menu",
        isEnabled: () => true,
        execute: () => {},
      },
    ]);

    const selector = ".o-menu div[data-name='test_menu']";
    const model = new Model();
    model.updateMode("readonly");
    const { fixture } = await mountComponent(Menu, {
      props: { menuItems, onClose: () => {}, onClickMenu: () => callback() },
      env: { model },
    });

    expect(fixture.querySelector(selector)!.classList).toContain("disabled");
    await simulateClick(selector);
    expect(callback).not.toHaveBeenCalled();
  });
});
