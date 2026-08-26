import { useProps, xml } from "@odoo/owl";
import { ActionSpec } from "../src/actions/action";
import { ActionButton } from "../src/components/action_button/action_button";
import { types } from "../src/components/props_validation";
import { SpreadsheetComponent } from "../src/components/spreadsheet/spreadsheet_component";
import { render } from "../src/helpers/owl3_helpers";
import { mountComponent, nextTick } from "./test_helpers/helpers";

class Parent extends SpreadsheetComponent {
  static components = { ActionButton };
  protected props = useProps({
    getAction: types.function<() => ActionSpec>(),
  });
  static template = xml/*xml*/ `
      <ActionButton action="this.props.getAction()"/>
    `;
}

test("ActionButton is updated when its props are updated", async () => {
  let action = { isActive: () => true, name: "TestAction" };
  const { parent, fixture } = await mountComponent(Parent, {
    props: { getAction: () => action },
  });
  const actionButton = fixture.querySelector(".o-menu-item-button")!;
  expect(actionButton.classList).toContain("active");

  action = { isActive: () => false, name: "TestAction" };
  render(parent, true);
  await nextTick();
  expect(actionButton.classList).not.toContain("active");
});
