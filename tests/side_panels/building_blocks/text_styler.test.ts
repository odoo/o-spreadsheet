import { TextStyler } from "../../../src/components/side_panel/chart/building_blocks/text_styler/text_styler";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountChartTitle(props: Partial<TextStyler["props"]>) {
  const defaultProps = {
    text: "My title",
    updateText: () => {},
    updateStyle: () => {},
    style: {},
    defaultStyle: { fontSize: 10 },
  };
  ({ fixture } = await mountComponentWithPortalTarget(TextStyler, {
    props: { ...defaultProps, ...props },
  }));
}

describe("Chart title", () => {
  test("Can render a chart title component", async () => {
    await mountChartTitle({});
    expect(fixture).toMatchSnapshot();
  });

  test("Can render a chart title component with default title prop if not provided", async () => {
    await mountChartTitle({
      text: undefined,
    });

    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("");
  });

  test("Update is called when title is changed, not on input", async () => {
    const updateText = jest.fn();
    await mountChartTitle({ updateText });
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("My title");
    await setInputValueAndTrigger(input, "My new title", "onlyInput");
    expect(updateText).toHaveBeenCalledTimes(0);
    input.dispatchEvent(new Event("change"));
    expect(updateText).toHaveBeenCalledTimes(1);
  });

  test("Can change text color", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({ updateStyle });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateStyle).toHaveBeenCalledWith({ color: "#EFEFEF" });
  });

  test.each(["Left", "Center", "Right"])(
    "Can change alignment to %s",
    async (alignment: string) => {
      const updateStyle = jest.fn();
      await mountChartTitle({ updateStyle });
      expect(updateStyle).toHaveBeenCalledTimes(0);
      await click(fixture, ".o-menu-item-button[title='Horizontal alignment']");
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(updateStyle).toHaveBeenCalledWith({ align: alignment.toLowerCase() });
    }
  );

  test("Can make text bold", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({ updateStyle });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Bold']");
    expect(updateStyle).toHaveBeenCalledWith({ bold: true });
  });

  test("Can make text italic", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({ updateStyle });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Italic']");
    expect(updateStyle).toHaveBeenCalledWith({ italic: true });
  });

  test("Can change font size", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({ updateStyle });
    const fontSizeEditor = fixture.querySelector(".o-font-size-editor")!;
    expect(fontSizeEditor).not.toBeNull();
    expect(updateStyle).toHaveBeenCalledTimes(0);
    const input = fontSizeEditor.querySelector("input")!;
    await setInputValueAndTrigger(input, "20");
    expect(updateStyle).toHaveBeenCalledWith({ fontSize: 20 });
  });
});
