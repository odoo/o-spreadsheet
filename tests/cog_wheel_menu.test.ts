import { Component } from "@odoo/owl";
import { CogWheelMenu } from "../src/components/side_panel/components/cog_wheel_menu/cog_wheel_menu";
import { click } from "./test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "./test_helpers/helpers";

async function mountCogWheelMenu(
  props: Partial<CogWheelMenu["props"]>
): Promise<{ component: CogWheelMenu; fixture: HTMLElement }> {
  let parent: Component;
  let fixture: HTMLElement;
  ({ parent, fixture } = await mountComponentWithPortalTarget(CogWheelMenu, {
    props: {
      items: [],
      ...props,
    },
  }));
  return { component: parent as CogWheelMenu, fixture };
}

const SELECTORS = {
  COG: ".fa-cog",
  MENU: ".o-menu",
  MENU_ITEM: ".o-menu-item",
};

describe("CogWheelMenu", () => {
  test("Can render a cog wheel menu", async () => {
    const { fixture } = await mountCogWheelMenu({});
    expect(fixture).toMatchSnapshot();
  });

  test("Clicking on the cog wheel menu toggles the menu", async () => {
    const { fixture } = await mountCogWheelMenu({
      items: [{ name: "test", execute: () => {} }],
    });
    expect(fixture.querySelector(SELECTORS.MENU)).toBeNull();
    await click(fixture, SELECTORS.COG);
    expect(fixture.querySelector(SELECTORS.MENU)).toBeTruthy();
    expect(fixture.querySelectorAll(SELECTORS.MENU_ITEM)).toHaveLength(1);

    await click(fixture, SELECTORS.COG);
    expect(fixture.querySelector(SELECTORS.MENU)).toBeNull();
  });

  test("Clicking on an item execute the action", async () => {
    const execute = jest.fn();
    const { fixture } = await mountCogWheelMenu({
      items: [{ name: "test", execute }],
    });
    await click(fixture, SELECTORS.COG);
    await click(fixture, SELECTORS.MENU_ITEM);
    expect(execute).toHaveBeenCalled();
  });

  test("Clicking outside closes the menu", async () => {
    const { fixture } = await mountCogWheelMenu({
      items: [{ name: "test", execute: () => {} }],
    });
    await click(fixture, SELECTORS.COG);
    expect(fixture.querySelector(SELECTORS.MENU)).toBeTruthy();
    await click(document.body);
    expect(fixture.querySelector(SELECTORS.MENU)).toBeNull();
  });
});
