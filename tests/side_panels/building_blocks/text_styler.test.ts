import { TextStyler } from "../../../src/components/side_panel/chart/building_blocks/text_styler/text_styler";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountChartTitle(props: Partial<TextStyler["props"]>) {
  ({ fixture } = await mountComponentWithPortalTarget(TextStyler, {
    props: {
      updateStyle: () => {},
      style: {},
      ...props,
    },
  }));
}

describe("Chart title", () => {
  test("Can render a chart title component", async () => {
    await mountChartTitle({ text: "My title", label: "Title" });
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a chart title component with default title prop if not provided", async () => {
    await mountChartTitle({});
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("");
  });

  test("Update is called when title is changed, not on input", async () => {
    const updateText = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateText,
    });
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("My title");
    await setInputValueAndTrigger(input, "My new title", "onlyInput");
    expect(updateText).toHaveBeenCalledTimes(0);
    input.dispatchEvent(new Event("change"));
    expect(updateText).toHaveBeenCalledTimes(1);
  });

  test("Can use the component without a text input", async () => {
    await mountChartTitle({ hasText: false });
    expect("input").toHaveCount(0);
  });

  test("Can change text color", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateStyle,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button[title='Text color']");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateStyle).toHaveBeenCalledWith({ color: "#EFEFEF" });
  });

  test("Can change fill color", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateStyle,
      hasBackgroundColor: true,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button[title='Fill color']");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateStyle).toHaveBeenCalledWith({ fillColor: "#EFEFEF" });
  });

  test.each(["Left", "Center", "Right"])(
    "Can change alignment to %s",
    async (alignment: string) => {
      const updateStyle = jest.fn();
      await mountChartTitle({
        text: "My title",
        updateStyle,
      });
      expect(updateStyle).toHaveBeenCalledTimes(0);
      await click(fixture, ".o-menu-item-button[title='Horizontal alignment']");
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(updateStyle).toHaveBeenCalledWith({ align: alignment.toLowerCase() });
    }
  );

  test("Can change vertical alignment", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateStyle,
      hasVerticalAlign: true,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Vertical alignment']");
    await click(fixture, `.o-menu-item-button[title='Middle']`);
    expect(updateStyle).toHaveBeenCalledWith({ verticalAlign: "middle" });
  });

  test("Can make text bold", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateStyle,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Bold']");
    expect(updateStyle).toHaveBeenCalledWith({ bold: true });
  });

  test("Can make text italic", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({
      text: "My title",
      updateStyle,
    });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Italic']");
    expect(updateStyle).toHaveBeenCalledWith({ italic: true });
  });
});
