import { Component, xml } from "@odoo/owl";
import { ActionSpec } from "../src/actions/action";
import { ActionButton } from "../src/components/action_button/action_button";
import { SpreadsheetChildEnv } from "../src/types";
import { mountComponent, nextTick } from "./test_helpers/helpers";

interface ParentProps {
  getAction: () => ActionSpec;
}

class Parent extends Component<ParentProps, SpreadsheetChildEnv> {
  static components = { ActionButton };
  static props = { getAction: Function };
  static template = xml/*xml*/ `
      <ActionButton action="props.getAction()"/>
    `;
}

test("ActionButton is updated when its props are updated", async () => {
  let action = { isActive: () => true, name: "TestAction" };
  const { parent, fixture } = await mountComponent(Parent, { props: { getAction: () => action } });
  const actionButton = fixture.querySelector(".o-menu-item-button")!;
  expect(actionButton.classList).toContain("active");

  action = { isActive: () => false, name: "TestAction" };
  parent.render(true);
  await nextTick();
  expect(actionButton.classList).not.toContain("active");
});
