import { ColorPicker } from "../../src/components/color_picker";
import { makeTestFixture } from "../test_helpers/helpers";

let fixture: HTMLElement;
let colorPicker: ColorPicker;

beforeEach(async () => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Color Picker tests", () => {
  test("Color picker is correctly positioned right without props given", async () => {
    colorPicker = new ColorPicker(null, { onColorPicked: () => ({}) });
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("center");
  });

  test("Color picker is correctly positioned right", async () => {
    colorPicker = new ColorPicker(null, { dropdownDirection: "right", onColorPicked: () => ({}) });
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("center");
  });

  test("Color picker is correctly positioned left", async () => {
    colorPicker = new ColorPicker(null, { dropdownDirection: "left", onColorPicked: () => ({}) });
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("center");
  });

  test("Color picker is correctly centered", async () => {
    colorPicker = new ColorPicker(null, { dropdownDirection: "center", onColorPicked: () => ({}) });
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("center");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
  });
});
