import { Component, xml } from "@odoo/owl";
import { Checkbox } from "../../../src/components/side_panel/components/checkbox/checkbox";
import { SpreadsheetChildEnv } from "../../../src/types";
import { click } from "../../test_helpers/dom_helper";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

type Props = Checkbox["props"];

class CheckboxContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="container">
      <Checkbox t-props="props"/>
    </div>
  `;
  static components = { Checkbox };
}

async function mountCheckbox(props: Props) {
  ({ fixture } = await mountComponent(CheckboxContainer, { props }));
}

describe("Checkbox", () => {
  test("Can render a checkbox", async () => {
    await mountCheckbox({ value: true, onChange: () => {} });
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a checkbox with a label", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, label: "My label" });
    expect(fixture.querySelector("label")!.textContent).toEqual("My label");
  });

  test("onChange props is called when the checkbox is clicked", async () => {
    const onChange = jest.fn();
    await mountCheckbox({ value: true, onChange });
    await click(fixture, "input[type=checkbox]");
    expect(onChange).toHaveBeenCalledWith(false);
    await click(fixture, "input[type=checkbox]");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("Can render a checkbox with a name", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, name: "My name" });
    expect(fixture.querySelector("input")!.getAttribute("name")).toEqual("My name");
  });

  test("Can render a checkbox with a custom className on the label", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, className: "custom-checkbox" });
    expect(fixture.querySelector("label")!.classList.contains("custom-checkbox")).toBe(true);
  });
});
