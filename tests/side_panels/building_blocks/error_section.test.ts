import { ChartErrorSection } from "../../../src/components/side_panel/chart/building_blocks/error_section/error_section";
import { mountComponent } from "../../test_helpers/helpers";

let fixture: HTMLElement;

async function mountChartErrorSection(props: ChartErrorSection["props"]) {
  ({ fixture } = await mountComponent(ChartErrorSection, { props }));
}

describe("Chart error section", () => {
  test("Can render a chart error section component", async () => {
    await mountChartErrorSection({
      messages: ["error_1", "error_2"],
    });
    expect(fixture).toMatchSnapshot();
  });

  test("Error section does not have a title", async () => {
    await mountChartErrorSection({
      messages: ["error_1", "error_2"],
    });
    expect(fixture.querySelector(".o-section-title")).toBeNull();
  });

  test("Messages are in error", async () => {
    await mountChartErrorSection({
      messages: ["error_1", "error_2"],
    });
    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(2);
  });
});
