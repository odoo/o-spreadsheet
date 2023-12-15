import { Component, xml } from "@odoo/owl";
import { ChartColor } from "../../../src/components/side_panel/chart/building_blocks/color/color";
import { SpreadsheetChildEnv } from "../../../src/types";
import { click } from "../../test_helpers/dom_helper";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

type Props = ChartColor["props"];

class Container extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <ChartColor t-props="props"/>
    </div>
  `;
  static components = { ChartColor };
}

async function mountChartColor(props: Props) {
  ({ fixture } = await mountComponent(Container, { props }));
}

describe("Chart color", () => {
  test("Can render a chart color component", async () => {
    await mountChartColor({ onColorPicked: () => {} });
    expect(fixture).toMatchSnapshot();
  });

  test("Color picker is not visible by default", async () => {
    await mountChartColor({ onColorPicked: () => {} });
    expect(fixture.querySelector(".o-color-picker")).toBeNull();
  });

  test("Clicking on icon should open color picker", async () => {
    await mountChartColor({ onColorPicked: () => {} });
    expect(fixture.querySelector(".o-color-picker")).toBeNull();
    await click(fixture, ".o-color-picker-button");
    expect(fixture.querySelector(".o-color-picker")).not.toBeNull();
  });

  test("Clicking outside color picker should close it", async () => {
    await mountChartColor({ onColorPicked: () => {} });
    await click(fixture, ".o-color-picker-button");
    expect(fixture.querySelector(".o-color-picker")).not.toBeNull();
    await click(fixture, ".o-spreadsheet");
    expect(fixture.querySelector(".o-color-picker")).toBeNull();
  });

  test("Selecting a color picker should call onColorPicked", async () => {
    const onColorPicked = jest.fn();
    await mountChartColor({ onColorPicked });
    await click(fixture, ".o-color-picker-button");
    await click(fixture, ".o-color-picker-line-item[data-color='#EFEFEF'");
    expect(onColorPicked).toHaveBeenCalledWith("#EFEFEF");
  });
});
