import { Checkbox } from "../../../src/components/side_panel/components/checkbox/checkbox";
import { click } from "../../test_helpers/dom_helper";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountCheckbox(props: Checkbox["props"]) {
  ({ fixture } = await mountComponent(Checkbox, { props }));
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
    expect(fixture.querySelector("input")?.getAttribute("name")).toEqual("My name");
  });

  test("Can render a checkbox with a title", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, title: "my title" });
    expect(fixture.querySelector("label")?.getAttribute("title")).toEqual("my title");
  });

  test("Can render a checkbox with a tooltip", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, title: "myTooltip" });
    expect(fixture.querySelector("label")!.getAttribute("title")).toEqual("myTooltip");
  });

  test("Can render a disabled checkbox", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, disabled: true });
    expect(fixture.querySelector("input")!.disabled).toEqual(true);
    expect(fixture.querySelector("label")!.classList).toContain("text-muted");
  });

  test("Can render a checkbox with a custom className on the label", async () => {
    await mountCheckbox({ value: true, onChange: () => {}, className: "custom-checkbox" });
    expect(fixture.querySelector("label")!.classList.contains("custom-checkbox")).toBe(true);
  });
});
