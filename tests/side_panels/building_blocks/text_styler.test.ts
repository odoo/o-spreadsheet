import { TextStyler } from "../../../src/components/side_panel/chart/building_blocks/text_styler/text_styler";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountChartTitle(props: TextStyler["props"]) {
  ({ fixture } = await mountComponentWithPortalTarget(TextStyler, { props }));
}

describe("Chart title", () => {
  test("Can render a chart title component", async () => {
    await mountChartTitle({
      text: "My title",
      updateText: () => {},
      updateStyle: () => {},
      style: {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a chart title component with default title prop if not provided", async () => {
    await mountChartTitle({
      updateText: () => {},
      updateStyle: () => {},
      style: {},
    });

    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("");
  });

  test("Update is called when title is changed, not on input", async () => {
    const updateText = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateStyle: () => {},
      updateText,
      style: {},
    });
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("My title");
    await setInputValueAndTrigger(input, "My new title", "onlyInput");
    expect(updateText).toHaveBeenCalledTimes(0);
    input.dispatchEvent(new Event("change"));
    expect(updateText).toHaveBeenCalledTimes(1);
  });

  test("updateStyle is called when text color is changed", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateText: () => {},
      style: {},
      updateStyle,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateStyle).toHaveBeenCalledWith({ color: "#EFEFEF" });
  });

  test.each(["Left", "Center", "Right"])(
    "updateStyle is called when alignment is changed",
    async (alignment: string) => {
      const updateStyle = jest.fn();
      await mountChartTitle({
        text: "My title",
        updateText: () => {},
        style: {},
        updateStyle,
      });
      expect(updateStyle).toHaveBeenCalledTimes(0);
      await click(fixture, ".o-menu-item-button[title='Horizontal alignment']");
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(updateStyle).toHaveBeenCalledWith({ align: alignment.toLowerCase() });
    }
  );

  test("updateStyle is called when clicking on bold button", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateText: () => {},
      style: {},
      updateStyle,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Bold']");
    expect(updateStyle).toHaveBeenCalledWith({ bold: true });
  });

  test("updateStyle is called when clicking on italic button", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateText: () => {},
      style: {},
      updateStyle,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Italic']");
    expect(updateStyle).toHaveBeenCalledWith({ italic: true });
  });
});
