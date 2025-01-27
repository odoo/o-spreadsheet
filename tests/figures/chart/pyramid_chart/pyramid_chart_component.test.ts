import { Model, SpreadsheetChildEnv, UID } from "../../../../src";
import { SidePanel } from "../../../../src/components/side_panel/side_panel/side_panel";
import { PyramidChartDefinition } from "../../../../src/types/chart/pyramid_chart";
import { createChart } from "../../../test_helpers";
import { openChartConfigSidePanel } from "../../../test_helpers/chart_helpers";
import { setInputValueAndTrigger, simulateClick } from "../../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

function getPyramidDefinition(chartId: UID): PyramidChartDefinition {
  return model.getters.getChartDefinition(chartId) as PyramidChartDefinition;
}

describe("Pyramid chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  });

  test("Only first 2 ranges are kept when changing the selection input", async () => {
    createChart(model, { type: "pyramid", dataSets: [] }, "id");
    await openChartConfigSidePanel(model, env, "id");

    const dataSeries = fixture.querySelector<HTMLInputElement>(".o-chart .o-data-series input")!;
    setInputValueAndTrigger(dataSeries, "A1:D5");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");

    expect(getPyramidDefinition("id").dataSets).toEqual([
      { dataRange: "A1:A5" },
      { dataRange: "B1:B5" },
    ]);

    const inputs = fixture.querySelectorAll<HTMLInputElement>(".o-chart .o-data-series input");
    expect(inputs).toHaveLength(2);
    expect(inputs[0].value).toBe("A1:A5");
    expect(inputs[1].value).toBe("B1:B5");
  });
});
