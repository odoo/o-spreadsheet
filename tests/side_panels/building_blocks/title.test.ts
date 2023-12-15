import { Component, xml } from "@odoo/owl";
import { ChartTitle } from "../../../src/components/side_panel/chart/building_blocks/title/title";
import { SpreadsheetChildEnv } from "../../../src/types";
import { setInputValueAndTrigger } from "../../test_helpers/dom_helper";
import { mountComponent } from "../../test_helpers/helpers";

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
  ({ fixture } = await mountComponent(Container, { props }));
}

describe("Chart title", () => {
  test("Can render a chart title component", async () => {
    await mountChartTitle({
      title: "My title",
      update: () => {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Update is called when title is changed, not on input", async () => {
    const update = jest.fn();
    await mountChartTitle({
      title: "My title",
      update,
    });
    const input = fixture.querySelector("input")!;
    expect(input.value).toBe("My title");
    await setInputValueAndTrigger(input, "My new title", "onlyInput");
    expect(update).toHaveBeenCalledTimes(0);
    input.dispatchEvent(new Event("change"));
    expect(update).toHaveBeenCalledTimes(1);
  });
});
