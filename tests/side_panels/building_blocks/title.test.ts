import { Component, xml } from "@odoo/owl";
import { ChartTitle } from "../../../src/components/side_panel/chart/building_blocks/title/title";
import { SpreadsheetChildEnv } from "../../../src/types";
import { click, setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget } from "../../test_helpers/helpers";

let fixture: HTMLElement;

type Props = ChartTitle["props"];

class Container extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="container">
      <ChartTitle t-props="props"/>
    </div>
  `;
  static components = { ChartTitle };
}

async function mountChartTitle(props: Props) {
  ({ fixture } = await mountComponentWithPortalTarget(Container, { props }));
}

describe("Chart title", () => {
  test("Can render a chart title component", async () => {
    await mountChartTitle({
      title: "My title",
      updateTitle: () => {},
      style: {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Update is called when title is changed, not on input", async () => {
    const updateTitle = jest.fn();
    await mountChartTitle({
      title: "My title",
      updateTitle,
      style: {},
    });
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("My title");
    await setInputValueAndTrigger(input, "My new title", "onlyInput");
    expect(updateTitle).toHaveBeenCalledTimes(0);
    input.dispatchEvent(new Event("change"));
    expect(updateTitle).toHaveBeenCalledTimes(1);
  });

  test("UpdateColor is called when title color is changed", async () => {
    const updateColor = jest.fn();
    await mountChartTitle({
      title: "My title",
      updateTitle: () => {},
      style: {},
      updateColor,
    });
    expect(updateColor).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-color-picker-button");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(updateColor).toHaveBeenCalledWith("#EFEFEF");
  });

  test.each(["Left", "Center", "Right"])(
    "UpdateAlignment is called when alignment is changed",
    async (alignment: string) => {
      const updateAlignment = jest.fn();
      await mountChartTitle({
        title: "My title",
        updateTitle: () => {},
        style: {},
        updateAlignment,
      });
      expect(updateAlignment).toHaveBeenCalledTimes(0);
      await click(fixture, ".o-menu-item-button[title='Horizontal alignment']");
      await click(fixture, `.o-menu-item-button[title='${alignment}']`);
      expect(updateAlignment).toHaveBeenCalledWith(alignment.toLowerCase());
    }
  );

  test("ToggleBold is called when clicking on bold button", async () => {
    const toggleBold = jest.fn();
    await mountChartTitle({
      title: "My title",
      updateTitle: () => {},
      style: {},
      toggleBold,
    });
    expect(toggleBold).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Bold']");
    expect(toggleBold).toHaveBeenCalledTimes(1);
  });

  test("ToggleItalic is called when clicking on italic button", async () => {
    const toggleItalic = jest.fn();
    await mountChartTitle({
      title: "My title",
      updateTitle: () => {},
      style: {},
      toggleItalic,
    });
    expect(toggleItalic).toHaveBeenCalledTimes(0);
    await click(fixture, ".o-menu-item-button[title='Italic']");
    expect(toggleItalic).toHaveBeenCalledTimes(1);
  });
});
