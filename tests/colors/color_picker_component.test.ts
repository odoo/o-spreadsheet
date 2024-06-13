import { Model } from "../../src";
import { ColorPicker, ColorPickerProps } from "../../src/components/color_picker/color_picker";
import { toHex } from "../../src/helpers";
import { Color } from "../../src/types";
import { setStyle } from "../test_helpers/commands_helpers";
import {
  getElComputedStyle,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-spreadsheet": () => ({ x: 0, y: 0, width: 1000, height: 1000 }),
});

let fixture: HTMLElement;

async function mountColorPicker(
  partialProps: Partial<ColorPickerProps> = {},
  model = Model.BuildSync()
) {
  const props = {
    onColorPicked: partialProps.onColorPicked || (() => {}),
    currentColor: partialProps.currentColor || "#000000",
    maxHeight: partialProps.maxHeight !== undefined ? partialProps.maxHeight : 1000,
    anchorRect: partialProps.anchorRect || { x: 0, y: 0, width: 0, height: 0 },
  };
  ({ fixture } = await mountComponentWithPortalTarget(ColorPicker, { model, props }));
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

  test("Clicking on '+', custom section except custom added colors must toggle the custom color picker", async () => {
    await mountColorPicker();
    const elements = fixture.querySelectorAll(".o-color-picker-toggler");
    for (const element of elements) {
      await simulateClick(element);
      expect(fixture.querySelector(".o-custom-selector")).toBeDefined();
      await simulateClick(element);
      expect(fixture.querySelector(".o-custom-selector")).toBeNull();
    }
  });

  test("Full component rendering", async () => {
    await mountColorPicker();
    await simulateClick(".o-color-picker-toggler-sign");
    expect(fixture.querySelector(".o-color-picker")).toMatchSnapshot();
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
    await setInputValueAndTrigger(".o-custom-input-preview input", color);
    const previewColor = toHex(getElComputedStyle(".o-color-preview", "backgroundColor"));
    // hex <-> hsla is not a bijection, this specific color
    // is not exactly the same when processed
    expect(previewColor).toBeSameColorAs(color, 0.01);
    await simulateClick(".o-add-button");
    expect(onColorPicked).toHaveBeenCalledWith(color);
  });

  test("Color from the input is sanitized", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    await simulateClick(".o-gradient");
    const color = "12ef78";
    await setInputValueAndTrigger(".o-custom-input-preview input", color);
    await simulateClick(".o-add-button");
    expect(onColorPicked).toHaveBeenCalledWith(toHex(color));
  });

  test("Cannot input an invalid color code", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    const target = document.querySelector(".o-custom-input-preview input");
    await setInputValueAndTrigger(target, "this is not a color");

    expect(fixture.querySelector(".o-wrong-color")).not.toBeNull();
    const addButton = fixture.querySelector(".o-add-button")!;
    expect(addButton.classList).toContain("o-disabled");
    await simulateClick(addButton);
    expect(onColorPicked).not.toHaveBeenCalled();
  });

  test("warning border of invalid color disappears when selecting on the gradient", async () => {
    const onColorPicked = jest.fn();
    await mountColorPicker({ onColorPicked });
    await simulateClick(".o-color-picker-toggler");
    await setInputValueAndTrigger(".o-custom-input-preview input", "this is not a color");
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
    const model = Model.BuildSync();
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

  test.each([
    "#fff",
    "fff",
    "#FFFFFF00", // Hex + alpha
  ])("Can input a custom HEX code, alpha is ignored", async (hexCode) => {
    await mountColorPicker();
    await simulateClick(".o-color-picker-toggler");

    const inputTarget = fixture.querySelector(".o-custom-input-preview input")!;
    await setInputValueAndTrigger(inputTarget, hexCode as Color);
    expect((inputTarget as HTMLInputElement).value).toBeSameColorAs(hexCode.slice(0, 7));
    const addButton = fixture.querySelector(".o-add-button")!;
    expect(addButton.classList).not.toContain("o-disabled");
  });

  test.each([
    "rgb(1,1,1)", // rgb
    "rgb(1,1,1,0.5)", // rgba
  ])("refuse non strictly HEX codes", async (hexCode) => {
    await mountColorPicker();
    await simulateClick(".o-color-picker-toggler");

    const inputTarget = fixture.querySelector(".o-custom-input-preview input")!;
    await setInputValueAndTrigger(inputTarget, hexCode as Color);
    expect((inputTarget as HTMLInputElement).value).toBe(hexCode.slice(0, 7));
    const addButton = fixture.querySelector(".o-add-button")!;
    expect(addButton.classList).toContain("o-disabled");
  });
});
