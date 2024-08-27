import { Component, xml } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../src";
import { TextInput } from "../../src/components/text_input/text_input";
import { click, keyDown, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountComponent } from "../test_helpers/helpers";

let fixture: HTMLElement;

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
  ({ fixture } = await mountComponent(TextInputContainer, { props }));
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

  test("can save the value with enter key", async () => {
    const onChange = jest.fn();
    await mountTextInput({ value: "hello", onChange });
    fixture.querySelector("input")!.focus();
    setInputValueAndTrigger(fixture.querySelector("input")!, "world");
    await keyDown({ key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("world");
  });

  test("selects input content upon focus", async () => {
    await mountTextInput({ value: "hello", onChange: () => {} });
    fixture.querySelector("input")!.focus();
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
});
