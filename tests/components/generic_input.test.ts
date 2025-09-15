import { Component, xml } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../src";
import { GenericInput } from "../../src/components/generic_input/generic_input";
import {
  click,
  keyDown,
  setInputValueAndTrigger,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { mountComponent } from "../test_helpers/helpers";

let fixture: HTMLElement;

type Props = GenericInput["props"];

class GenericInputContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="container">
      <GenericInput t-props="props"/>
    </div>
  `;
  static components = { GenericInput };
  static props = GenericInput.props;
}

async function mountGenericInput(props: Props) {
  ({ fixture } = await mountComponent(GenericInputContainer, { props }));
}

describe("GenericInput", () => {
  test("Can render a generic input", async () => {
    await mountGenericInput({ value: "hello", onChange: () => {} });
    expect(fixture).toMatchSnapshot();
    expect(fixture.querySelector("input")!.value).toEqual("hello");
  });

  test("can render a generic input with a placeholder", async () => {
    await mountGenericInput({ value: "", onChange: () => {}, placeholder: "My placeholder" });
    expect(fixture.querySelector("input")!.getAttribute("placeholder")).toEqual("My placeholder");
  });

  test("can render a text input with a custom className and id", async () => {
    await mountGenericInput({ value: "", onChange: () => {}, class: "my-class", id: "my-id" });
    expect(fixture.querySelector("input")!.classList.contains("my-class")).toBe(true);
    expect(fixture.querySelector("input")!.id).toEqual("my-id");
  });

  test("can save the value when clicking outside the input", async () => {
    const onChange = jest.fn();
    await mountGenericInput({ value: "hello", onChange });
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    await click(document.body);
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("onChange is not called when clicking outside the input if the value is not modified", async () => {
    const onChange = jest.fn();
    await mountGenericInput({ value: "hello", onChange });
    await click(document.body);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("can save the value with enter key", async () => {
    const onChange = jest.fn();
    await mountGenericInput({ value: "hello", onChange });
    fixture.querySelector("input")!.focus();
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    await keyDown({ key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("selects input content upon mouseup", async () => {
    await mountGenericInput({ value: "hello", onChange: () => {} });
    triggerMouseEvent("input", "pointerup");
    expect(fixture.querySelector("input")!.selectionStart).toEqual(0);
    expect(fixture.querySelector("input")!.selectionEnd).toEqual(5);
  });

  test("saves the value on input blur", async () => {
    const onChange = jest.fn();
    await mountGenericInput({ value: "hello", onChange });
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    fixture.querySelector("input")!.blur();
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("can reset the value with escape key", async () => {
    const onChange = jest.fn();
    await mountGenericInput({ value: "hello", onChange });
    const input = fixture.querySelector("input")! as HTMLInputElement;
    input.value = "world";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toEqual("hello");
  });

  test("Input is not focused by default", async () => {
    await mountGenericInput({ value: "hello", onChange: () => {} });
    expect(fixture.querySelector("input")).not.toEqual(document.activeElement);
  });

  test("Can autofocus the input", async () => {
    await mountGenericInput({ value: "hello", onChange: () => {}, autofocus: true });
    expect(fixture.querySelector("input")).toEqual(document.activeElement);
  });
});
