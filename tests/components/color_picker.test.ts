import { App } from "@odoo/owl";
import { ColorPicker } from "../../src/components/color_picker";
import { OWL_TEMPLATES } from "../setup/jest.setup";
import { makeTestFixture } from "../test_helpers/helpers";

let fixture: HTMLElement;

beforeEach(async () => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

async function mountColorPicker(props): Promise<ColorPicker> {
  const app = new App(ColorPicker, { props });
  app.addTemplates(OWL_TEMPLATES);
  return await app.mount(fixture);
}

describe("Color Picker tests", () => {
  test("Color picker is correctly positioned right without props given", async () => {
    await mountColorPicker({ onColorPicked: () => ({}) });
    expect(document.querySelector(".o-color-picker")?.classList).toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("center");
  });

  test("Color picker is correctly positioned right", async () => {
    await mountColorPicker({ onColorPicked: () => ({}), dropdownDirection: "right" });
    expect(document.querySelector(".o-color-picker")?.classList).toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("center");
  });

  test("Color picker is correctly positioned left", async () => {
    await mountColorPicker({ onColorPicked: () => ({}), dropdownDirection: "left" });
    expect(document.querySelector(".o-color-picker")?.classList).toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("center");
  });

  test("Color picker is correctly centered", async () => {
    await mountColorPicker({
      onColorPicked: () => ({}),
      dropdownDirection: "center",
    });
    expect(document.querySelector(".o-color-picker")?.classList).toContain("center");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
  });
});
