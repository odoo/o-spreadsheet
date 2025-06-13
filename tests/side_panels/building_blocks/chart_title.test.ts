import { ChartTitle } from "../../../src/components/side_panel/chart/building_blocks/chart_title/chart_title";
import { TextStyler } from "../../../src/components/side_panel/chart/building_blocks/text_styler/text_styler";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountChartTitle(props: Partial<ChartTitle["props"]>) {
  const defaultProps: ChartTitle["props"] = {
    name: "Chart title",
    title: "My title",
    updateTitle: () => {},
    updateStyle: () => {},
    style: {},
    defaultStyle: { fontSize: 10 },
  };
  ({ fixture } = await mountComponentWithPortalTarget(ChartTitle, {
    props: { ...defaultProps, ...props },
  }));
}

async function mountTextStyler(props: Partial<TextStyler["props"]>) {
  const defaultProps: TextStyler["props"] = {
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
      title: undefined,
    });
    expect(".o-chart-title .o-composer").toHaveText("");
  });

  test("Can change text color", async () => {
    const updateStyle = jest.fn();
    await mountChartTitle({ updateStyle });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button[title='Text color']");
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

describe("TextStyler", () => {
  test("Alignments buttons are not visible by default", async () => {
    await mountTextStyler({});

    expect(".o-menu-item-button[title='Horizontal alignment']").toHaveCount(0);
    expect(".o-menu-item-button[title='Vertical alignment']").toHaveCount(0);
  });

  test("Can show horizontal alignment buttons", async () => {
    await mountTextStyler({ hasHorizontalAlign: true, hasVerticalAlign: true });

    expect(".o-menu-item-button[title='Horizontal alignment']").toHaveCount(1);
    expect(".o-menu-item-button[title='Vertical alignment']").toHaveCount(1);
  });

  test("Can change fill color", async () => {
    const updateStyle = jest.fn();
    await mountTextStyler({ updateStyle, hasBackgroundColor: true });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button[title='Fill color']");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateStyle).toHaveBeenCalledWith({ fillColor: "#EFEFEF" });
  });

  test("Can change vertical alignment", async () => {
    const updateStyle = jest.fn();
    await mountTextStyler({ updateStyle, hasVerticalAlign: true });
    expect(updateStyle).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Vertical alignment']");
    await click(fixture, `.o-menu-item-button[title='Middle']`);
    expect(updateStyle).toHaveBeenCalledWith({ verticalAlign: "middle" });
  });
});
