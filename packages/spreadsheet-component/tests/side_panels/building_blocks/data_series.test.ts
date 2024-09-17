import { ChartDataSeries } from "../../../src/components/side_panel/chart/building_blocks/data_series/data_series";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountDataSeries(props: ChartDataSeries["props"]) {
  ({ fixture } = await mountComponent(ChartDataSeries, { props }));
}

describe("Data Series", () => {
  test("Can render a data series component", async () => {
    await mountDataSeries({
      ranges: [{ dataRange: "A1:B1" }],
      onSelectionChanged: () => {},
      onSelectionConfirmed: () => {},
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Title is 'Data range' when hasSingleRange is true", async () => {
    await mountDataSeries({
      ranges: [{ dataRange: "A1:B1" }],
      onSelectionChanged: () => {},
      onSelectionConfirmed: () => {},
      hasSingleRange: true,
    });
    expect(fixture.querySelector(".o-section-title")!.textContent).toEqual("Data range");
  });

  test("Title is 'Data series' when hasSingleRange is false", async () => {
    await mountDataSeries({
      ranges: [{ dataRange: "A1:B1" }],
      onSelectionChanged: () => {},
      onSelectionConfirmed: () => {},
      hasSingleRange: false,
    });
    expect(fixture.querySelector(".o-section-title")!.textContent).toEqual("Data series");
  });
});
