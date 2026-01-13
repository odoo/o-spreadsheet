import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, xml } from "@odoo/owl";
import { TextInput } from "../../src/components/text_input/text_input";
import {
  click,
  keyDown,
  setInputValueAndTrigger,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

let fixture: HTMLElement;
let parent: Component;
type Props = TextInput["props"];

class TextInputContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="container">
      <TextInput t-props="props"/>
    </div>
  `;
  static components = { TextInput };
  static props = TextInput.props;
}

async function mountTextInput(props: Props) {
  ({ fixture, parent } = await mountComponent(TextInputContainer, { props }));
}

describe("TextInput", () => {
  test("Can render a text input", async () => {
    await mountTextInput({ value: "hello", onChange: () => {} });
    expect(fixture).toMatchSnapshot();
    expect(fixture.querySelector("input")!.value).toEqual("hello");
  });

  test("can render a text input with a placeholder", async () => {
    await mountTextInput({ value: "", onChange: () => {}, placeholder: "My placeholder" });
    expect(fixture.querySelector("input")!.getAttribute("placeholder")).toEqual("My placeholder");
  });

  test("can render a text input with a custom className and id", async () => {
    await mountTextInput({ value: "", onChange: () => {}, class: "my-class", id: "my-id" });
    expect(fixture.querySelector("input")!.classList.contains("my-class")).toBe(true);
    expect(fixture.querySelector("input")!.id).toEqual("my-id");
  });

  test("can save the value when clicking outside the input", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    await click(document.body);
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("onChange is not called when clicking outside the input if the value is not modified", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    await click(document.body);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("can save the value with enter key, and the onChange is only called once", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    fixture.querySelector("input")!.focus();
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    await keyDown({ key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("selects input content upon mouseup", async () => {
    await mountTextInput({ value: "hello", onChange: () => {}, selectContentOnFocus: true });
    triggerMouseEvent("input", "pointerup");
    expect(fixture.querySelector("input")!.selectionStart).toEqual(0);
    expect(fixture.querySelector("input")!.selectionEnd).toEqual(5);
  });

  test("saves the value on input blur", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    fixture.querySelector("input")!.blur();
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("can reset the value with escape key", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    const input = fixture.querySelector("input")! as HTMLInputElement;
    input.value = "world";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toEqual("hello");
  });

  test("Input is not focused by default", async () => {
    await mountTextInput({ value: "hello", onChange: () => {} });
    expect(fixture.querySelector("input")).not.toEqual(document.activeElement);
  });

  test("Can autofocus the input", async () => {
    await mountTextInput({ value: "hello", onChange: () => {}, autofocus: true });
    expect(fixture.querySelector("input")).toEqual(document.activeElement);
  });

  test("Input is preserved while in edition", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    const input = fixture.querySelector("input")! as HTMLInputElement;
    expect(input.value).toEqual("hello");
    // focus the input and change its value
    input.focus();
    input.value = "world";
    parent.render(true);
    await nextTick();
    expect(input.value).toEqual("world");
  });

  test("can render a text input in error", async () => {
    await mountTextInput({ value: "", onChange: () => {}, errorMessage: "Error Message" });
    expect("input").toHaveClass("o-invalid");
    expect(".os-input-error-icon").toHaveCount(1);
    expect(".os-input-error-icon").toHaveAttribute("title", "Error Message");
  });
});
