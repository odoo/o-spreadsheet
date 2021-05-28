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
    colorPicker = new ColorPicker(null, {});
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
  });

  test("Color picker is correctly positioned right", async () => {
    colorPicker = new ColorPicker(null, { dropdownDirection: "right" });
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("right");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("left");
  });

  test("Color picker is correctly positioned left", async () => {
    colorPicker = new ColorPicker(null, { dropdownDirection: "left" });
    await colorPicker.mount(fixture);
    expect(document.querySelector(".o-color-picker")?.classList).toContain("left");
    expect(document.querySelector(".o-color-picker")?.classList).not.toContain("right");
  });
});
