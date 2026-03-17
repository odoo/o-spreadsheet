import { Model, UID } from "@odoo/o-spreadsheet-engine";
import { createChart, createScorecardChart, createSheet, doubleClick } from "../test_helpers";
import { mockChart, mountSpreadsheet } from "../test_helpers/helpers";

mockChart();

let model: Model;
let sheetId: UID;
let fixture: HTMLElement;

beforeEach(() => {
  model = new Model();
  sheetId = model.getters.getActiveSheetId();
});

async function mountMobileDashboard() {
  model.updateMode("dashboard");
  ({ fixture } = await mountSpreadsheet({ model }, { isSmall: true }));
}

describe("Mobile dashboard", () => {
  test("is empty with no figures", async () => {
    await mountMobileDashboard();
    expect(".o-mobile-dashboard").toHaveCount(1);
    expect(".o-mobile-dashboard").toHaveText(
      " Only chart figures are displayed in small screens but this dashboard doesn't contain any "
    );
  });

  test("displays figures in first sheet", async () => {
    createSheet(model, { sheetId: "sh2" });
    createChart(model, { type: "bar" }, "chart1Id", sheetId);
    createChart(model, { type: "pie" }, "chart2Id", "sh2");
    await mountMobileDashboard();
    expect(".o-chart-container").toHaveCount(1);
  });

  test("scorecards are placed two per row", async () => {
    createScorecardChart(model, {});
    createScorecardChart(model, {});
    createScorecardChart(model, {});
    createChart(model, { type: "bar" }, "chart1Id", sheetId);
    await mountMobileDashboard();
    const figureRows = fixture.querySelectorAll(".o-figure-row");
    expect(figureRows).toHaveLength(3);
    expect(figureRows[0].querySelectorAll(".o-scorecard")).toHaveLength(2);

    expect(figureRows[1].querySelectorAll(".o-scorecard")).toHaveLength(1);
    expect(figureRows[1].querySelectorAll(".o_empty_figure")).toHaveLength(1);

    expect(figureRows[2].querySelectorAll(".o-figure-canvas")).toHaveLength(1);
  });

  test("double clicking on a chart doesn't open the side panel", async () => {
    createChart(model, { type: "bar" }, "chart1Id", sheetId);
    await mountMobileDashboard();
    await doubleClick(fixture, ".o-chart-container");
    expect(".o-sidePanel").toHaveCount(0);
  });
});
