import { Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import { ColorPicker, ColorPickerProps } from "../../src/components/color_picker/color_picker";
import { toHex } from "../../src/helpers";
import { SpreadsheetChildEnv } from "../../src/types";
import { setStyle } from "../test_helpers/commands_helpers";
import {
  getElComputedStyle,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-spreadsheet": () => ({ x: 0, y: 0, width: 1000, height: 1000 }),
});

let fixture: HTMLElement;

class ColorPickerTestParent extends Component<ColorPickerProps, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <ColorPicker t-props="props"/>
    </div>
  `;
  static components = { ColorPicker };
}

async function mountColorPicker(partialProps: Partial<ColorPickerProps> = {}, model = new Model()) {
  const props = {
    onColorPicked: partialProps.onColorPicked || (() => {}),
    currentColor: partialProps.currentColor || "#000000",
    maxHeight: partialProps.maxHeight !== undefined ? partialProps.maxHeight : 1000,
    anchorRect: partialProps.anchorRect || { x: 0, y: 0, width: 0, height: 0 },
  };
  ({ fixture } = await mountComponent(ColorPickerTestParent, { model, props }));
}

test("Color picker is correctly positioned", async () => {
  await mountColorPicker({ anchorRect: { x: 100, y: 100, width: 50, height: 50 } });
  expect(getElComputedStyle(".o-popover", "left")).toEqual("100px");
  expect(getElComputedStyle(".o-popover", "top")).toEqual("150px");
});

describe("Color Picker buttons", () => {
  test("Click on 'reset' button reset the cell style", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ currentColor: "#45818e", onColorPicked });
    await simulateClick(".o-cancel");
    expect(onColorPicked).toHaveBeenCalledWith("");
  });

  test("Click on '+' button toggle the custom color part", async () => {
    await mountColorPicker();
    await simulateClick(".o-color-picker-toggler");
    expect(fixture.querySelector(".o-custom-selector")).toBeDefined();
    await simulateClick(".o-color-picker-toggler");
    expect(fixture.querySelector(".o-custom-selector")).toBeNull();
  });

  test("Can pick a standard color", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick("div[data-color='#FF9900']");
    expect(onColorPicked).toHaveBeenCalledWith("#FF9900");
  });

  test("Can pick a custom color in the gradient", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    await simulateClick(".o-gradient");
    const inputCodeEl = fixture.querySelector(".o-custom-input-preview input") as HTMLInputElement;
    const previewColor = toHex(getElComputedStyle(".o-color-preview", "backgroundColor"));
    const inputColorCode = inputCodeEl.value;
    expect(previewColor).toBeSameColorAs(inputColorCode);
    await simulateClick(".o-add-button");
    expect(onColorPicked).toHaveBeenCalledWith(inputColorCode);
  });

  test("Can choose a custom color with the input", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    await simulateClick(".o-gradient");
    const color = "#12EF78";
    setInputValueAndTrigger(".o-custom-input-preview input", color, "input");
    await nextTick();
    const previewColor = toHex(getElComputedStyle(".o-color-preview", "backgroundColor"));
    expect(previewColor).toEqual(color);
    await simulateClick(".o-add-button");
    expect(onColorPicked).toHaveBeenCalledWith(color);
  });

  test("Color from the input is sanitized", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    await simulateClick(".o-gradient");
    const color = "12ef78";
    setInputValueAndTrigger(".o-custom-input-preview input", color, "input");
    await nextTick();
    await simulateClick(".o-add-button");
    expect(onColorPicked).toHaveBeenCalledWith(toHex(color));
  });

  test("Cannot input an invalid color code", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    setInputValueAndTrigger(".o-custom-input-preview input", "this is not a color", "input");
    await nextTick();
    expect(fixture.querySelector(".o-wrong-color")).toBeNull();
    await simulateClick(".o-add-button");
    expect(fixture.querySelector(".o-wrong-color")).not.toBeNull();
    expect(onColorPicked).not.toHaveBeenCalled();
  });

  test("warning border of invalid color disappears when selecting on the gradient", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    setInputValueAndTrigger(".o-custom-input-preview input", "this is not a color", "input");
    await nextTick();
    await simulateClick(".o-add-button");
    expect(fixture.querySelector(".o-wrong-color")).not.toBeNull();
    await simulateClick(".o-gradient");
    expect(fixture.querySelector(".o-wrong-color")).toBeNull();
    await simulateClick(".o-add-button");
    expect(onColorPicked).toHaveBeenCalled();
  });

  test("initial standard color", async () => {
    await mountColorPicker({ currentColor: "#45818e" });
    const color = fixture.querySelector("div[data-color='#45818E']") as HTMLElement;
    expect(color?.textContent).toBe(" ✓ ");
  });

  test("initial custom color", async () => {
    const model = new Model();
    setStyle(model, "A1", { fillColor: "#123456" });
    await mountColorPicker({ currentColor: "#123456" }, model);
    const color = fixture.querySelector("div[data-color='#123456']") as HTMLElement;
    expect(color?.textContent).toBe(" ✓ ");
  });

  test("wrong initial color", async () => {
    await mountColorPicker({ currentColor: "azeazeaze" });
    await simulateClick(".o-color-picker-toggler");
    const inputCodeEl = fixture.querySelector(".o-custom-input-preview input") as HTMLInputElement;
    expect(inputCodeEl.value).toBe("");
  });

  test("color picker disappears when maxHeight is 0", async () => {
    await mountColorPicker({ currentColor: "#45818e", maxHeight: 0 });
    const picker = fixture.querySelector<HTMLElement>(".o-color-picker")!;
    expect(picker.style["display"]).toEqual("none");
  });
});
