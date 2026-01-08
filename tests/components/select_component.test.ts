import { ValueAndLabel } from "@odoo/o-spreadsheet-engine";
import { Select } from "../../src/components/select/select";
import { keyDown, simulateClick, triggerMouseEvent } from "../test_helpers";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

const testValues: ValueAndLabel[] = [
  { value: "option_1", label: "Option 1" },
  { value: "option_2", label: "Option 2" },
  { value: "option_3", label: "Option 3", separator: true },
  { value: "option_4", label: "Option 4" },
];

let fixture: HTMLElement;
let selectEl: HTMLElement;
let onChange: jest.Mock;

async function mountSelectMenu(partialProps: Partial<Select["props"]> = {}) {
  onChange = jest.fn();
  const props: Select["props"] = {
    values: testValues,
    onChange,
    ...partialProps,
  };
  ({ fixture } = await mountComponentWithPortalTarget(Select, { props }));
  selectEl = fixture.querySelector<HTMLElement>(".o-select")!;
}

describe("Select component", () => {
  test("Can use keyboard to open & navigate the select dropdown", async () => {
    await mountSelectMenu();

    selectEl.focus();
    expect(".o-select-dropdown").toHaveCount(0);
    await keyDown({ key: "ArrowDown" });
    expect(".o-select-dropdown").toHaveCount(1);
    expect(".o-select-option.o-active").toHaveText("Option 1");

    await keyDown({ key: "ArrowDown" });
    expect(".o-select-option.o-active").toHaveText("Option 2");

    await keyDown({ key: "ArrowDown" });
    expect(".o-select-option.o-active").toHaveText("Option 3");

    await keyDown({ key: "ArrowUp" });
    expect(".o-select-option.o-active").toHaveText("Option 2");

    await keyDown({ key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("option_2");
    expect(".o-select-dropdown").toHaveCount(0);
  });

  test("Can use mouse hover events and enter key to select option", async () => {
    await mountSelectMenu({ selectedValue: "option_2" });

    await simulateClick(selectEl);
    expect(".o-select-dropdown").toHaveCount(1);
    expect(".o-select-option.o-active").toHaveText("Option 2");

    triggerMouseEvent(".o-select-option[data-id='option_4']", "mouseenter");
    await nextTick();
    expect(".o-select-option.o-active").toHaveText("Option 4");

    await keyDown({ key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("option_4");
    expect(".o-select-dropdown").toHaveCount(0);
  });
});
