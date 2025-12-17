import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, xml } from "@odoo/owl";
import { NumberInput } from "../../src/components/number_input/number_input";
import {
  click,
  keyDown,
  setInputValueAndTrigger,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

let fixture: HTMLElement;
let parent: Component;
type Props = NumberInput["props"];

class NumberInputContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="container">
      <NumberInput t-props="props"/>
    </div>
  `;
  static components = { NumberInput };
  static props = NumberInput.props;
}

async function mountNumberInput(props: Props) {
  ({ fixture, parent } = await mountComponent(NumberInputContainer, { props }));
}

describe("NumberInput", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  test("Can render a number input", async () => {
    await mountNumberInput({ value: 5, onChange: () => {} });
    expect(fixture).toMatchSnapshot();
    expect(fixture.querySelector("input")!.value).toEqual("5");
  });

  test("can render a number input with a placeholder", async () => {
    await mountNumberInput({ value: 0, onChange: () => {}, placeholder: "My placeholder" });
    expect(fixture.querySelector("input")!.getAttribute("placeholder")).toEqual("My placeholder");
  });

  test("can render a number input with a custom className and id", async () => {
    await mountNumberInput({ value: 5, onChange: () => {}, class: "my-class", id: "my-id" });
    expect(fixture.querySelector("input")!.classList.contains("my-class")).toBe(true);
    expect(fixture.querySelector("input")!.id).toEqual("my-id");
  });

  test("can save the value when clicking outside the input", async () => {
    const onChange = jest.fn();
    await mountNumberInput({ value: 5, onChange });
    setInputValueAndTrigger(fixture.querySelector("input")!, "2");
    await click(document.body);
    jest.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalledWith("2");
  });

  test("onChange is not called when clicking outside the input if the value is not modified", async () => {
    const onChange = jest.fn();
    await mountNumberInput({ value: 5, onChange });
    await click(document.body);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("can save the value with enter key", async () => {
    const onChange = jest.fn();
    await mountNumberInput({ value: 5, onChange });
    fixture.querySelector("input")!.focus();
    setInputValueAndTrigger(fixture.querySelector("input")!, "4");
    await keyDown({ key: "Enter" });
    jest.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalledWith("4");
  });

  test("selects input content upon mouseup", async () => {
    await mountNumberInput({ value: 10000, onChange: () => {}, selectContentOnFocus: true });
    const input = fixture.querySelector("input")! as HTMLInputElement;

    jest.spyOn(input, "select"); // the selection not supported in jsdom, we'll just spy the select method
    triggerMouseEvent(input, "pointerup");
    expect(input.select).toHaveBeenCalled();
  });

  test("saves the value on input blur", async () => {
    const onChange = jest.fn();
    await mountNumberInput({ value: 5, onChange });
    setInputValueAndTrigger(fixture.querySelector("input")!, "2");
    fixture.querySelector("input")!.blur();
    jest.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalledWith("2");
  });

  test("can reset the value with escape key", async () => {
    const onChange = jest.fn();
    await mountNumberInput({ value: 5, onChange });
    const input = fixture.querySelector("input")! as HTMLInputElement;
    input.value = "2";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toEqual("5");
  });

  test("Input is not focused by default", async () => {
    await mountNumberInput({ value: 5, onChange: () => {} });
    expect(fixture.querySelector("input")).not.toEqual(document.activeElement);
  });

  test("Can autofocus the input", async () => {
    await mountNumberInput({ value: 5, onChange: () => {}, autofocus: true });
    expect(fixture.querySelector("input")).toEqual(document.activeElement);
  });

  test("Input is preserved while in edition", async () => {
    const onChange = jest.fn();
    await mountNumberInput({ value: 45, onChange });
    const input = fixture.querySelector("input")! as HTMLInputElement;
    expect(input.value).toEqual("45");
    // focus the input and change its value
    input.focus();
    input.value = "12";
    parent.render(true);
    await nextTick();
    expect(input.value).toEqual("12");
  });
});
