import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../../../src";
import { SidePanels } from "../../../../src/components/side_panel/side_panels/side_panels";
import { createChart } from "../../../test_helpers";
import { openChartConfigSidePanel, toChartDataSource } from "../../../test_helpers/chart_helpers";
import { setInputValueAndTrigger, simulateClick } from "../../../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../../../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

describe("Pyramid chart side panel", () => {
  beforeEach(async () => {
    model = new Model();
    ({ fixture, env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  });

  test("Only first 2 ranges are enabled when changing the selection input", async () => {
    createChart(model, { type: "pyramid", ...toChartDataSource({ dataSets: [] }) }, "id");
    await openChartConfigSidePanel(model, env, "id");

    const dataSeries = fixture.querySelector<HTMLInputElement>(".o-chart .o-data-series input")!;
    setInputValueAndTrigger(dataSeries, "A1:D5");
    await nextTick();
    await simulateClick(".o-data-series .o-selection-ok");

    expect(".o-data-series input").toHaveCount(4);
    expect(".o-data-series input.o-disabled-ranges").toHaveCount(2);
  });
});
