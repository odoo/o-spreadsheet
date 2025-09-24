import { Action, createActions } from "../src/actions/action";
import { SelectMenu, SelectMenuProps } from "../src/components/side_panel/select_menu/select_menu";
import { click } from "./test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "./test_helpers/helpers";

const testMenuItems: Action[] = createActions([
  { name: "item1", id: "item1", execute: () => {} },
  { name: "item2", id: "item2", execute: () => {} },
]);

describe("data validation sidePanel component", () => {
  let fixture: HTMLElement;

  async function mountSelectMenu(props: SelectMenuProps) {
    ({ fixture } = await mountComponentWithPortalTarget(SelectMenu, { props }));
  }

  test("Clicking on the select opens a menu", async () => {
    await mountSelectMenu({ menuItems: testMenuItems, selectedValue: "item1" });
    await click(fixture, "select");
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    expect(fixture.querySelector(".o-menu-item[data-name='item1']")).toBeTruthy();
    expect(fixture.querySelector(".o-menu-item[data-name='item2']")).toBeTruthy();
  });

  test("Select element have the correct value", async () => {
    await mountSelectMenu({ menuItems: testMenuItems, selectedValue: "item1" });
    const select = fixture.querySelector<HTMLElement>("select")!;
    expect(select.textContent).toBe("item1");
  });

  test("Select element have the correct classes", async () => {
    await mountSelectMenu({
      menuItems: testMenuItems,
      selectedValue: "item1",
      class: "class1 class2",
    });
    const select = fixture.querySelector<HTMLElement>("select")!;
    expect(select.classList).toContain("class1");
    expect(select.classList).toContain("class2");
  });
});
