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
  COG: ".os-cog-wheel-menu-icon",
  MENU: ".os-cog-wheel-menu",
};

describe("CogWheelMenu", () => {
  test("Can render a cog wheel menu", async () => {
    const { fixture } = await mountCogWheelMenu({});
    expect(fixture).toMatchSnapshot();
  });

  test("Clicking on the cog wheel menu opens the menu", async () => {
    const { fixture } = await mountCogWheelMenu({
      items: [
        {
          name: "test",
          onClick: () => {},
        },
      ],
    });
    expect(fixture.querySelector(".os-cog-wheel-menu")).toBeNull();
    await click(fixture, SELECTORS.COG);
    expect(fixture.querySelector(".os-cog-wheel-menu")).toBeTruthy();
    expect(fixture.querySelectorAll(SELECTORS.MENU)).toHaveLength(1);
  });

  test("Clicking on an item execute the action", async () => {
    const onClick = jest.fn();
    const { fixture } = await mountCogWheelMenu({
      items: [
        {
          name: "test",
          onClick,
        },
      ],
    });
    await click(fixture, SELECTORS.COG);
    await click(fixture, `${SELECTORS.MENU} div`);
  });

  test("Clicking outside closes the menu", async () => {
    const onClick = jest.fn();
    const { fixture } = await mountCogWheelMenu({
      items: [
        {
          name: "test",
          onClick,
        },
      ],
    });
    await click(fixture, SELECTORS.COG);
    expect(fixture.querySelector(".os-cog-wheel-menu")).toBeTruthy();
    await click(document.body);
    expect(fixture.querySelector(".os-cog-wheel-menu")).toBeNull();
  });
});
