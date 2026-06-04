import { Model } from "../../src";
import { PerfProfilePanel } from "../../src/components/side_panel/perf_profile/perf_profile_panel";
import { toZone } from "../../src/helpers/zones";
import { createSheet, deleteSheet, setCellContent } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import {
  createModelFromGrid,
  mountComponentWithPortalTarget,
  nextTick,
} from "../test_helpers/helpers";

let fixture: HTMLElement;

async function mountPanel(modelArg?: Model) {
  ({ fixture } = await mountComponentWithPortalTarget(PerfProfilePanel, {
    model: modelArg,
    props: { onCloseSidePanel: () => {} },
  }));
}

describe("PerfProfilePanel", () => {
  test("shows 'Analyze performance' button before profiling", async () => {
    await mountPanel();
    expect(".o-perf-profile-panel .o-button.primary").toHaveCount(1);
    expect(fixture.querySelector(".o-button.primary")!.textContent).toContain(
      "Analyze performance"
    );
    expect(".o-perf-range-entry").toHaveCount(0);
  });

  test("clicking 'Analyze performance' triggers profiling and shows results", async () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)", B1: "5" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    expect(model.getters.getPerfProfile()).toBeDefined();
    // After profiling, the summary section is shown
    expect(fixture.textContent).toContain("Total time");
    expect(fixture.textContent).toContain("Cells");
    expect(fixture.textContent).toContain("Function calls");
    expect(".o-perf-range-entry").toHaveCount(1);
  });

  test("entry shows function name and label", async () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    const entry = fixture.querySelector(".o-perf-range-entry")!;
    expect(entry.textContent).toContain("SUM");
    expect(entry.textContent).toContain("Sheet1!A1");
  });

  test("entry shows time and percentage", async () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    const entry = fixture.querySelector(".o-perf-range-entry")!;
    expect(entry.textContent).toContain("ms");
    expect(entry.textContent).toContain("%");
  });

  test("clicking an entry selects it", async () => {
    const model = createModelFromGrid({ A2: "=SUM(1, 2)", A3: "=SUM(3, 4)" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    const entries = fixture.querySelectorAll(".o-perf-range-entry");
    expect(entries[0].classList.contains("o-perf-entry-selected")).toBe(false);

    await click(entries[0] as HTMLElement);
    expect(entries[0].classList.contains("o-perf-entry-selected")).toBe(true);
    expect(model.getters.getSelectedZones()).toEqual([toZone("A2")]);
  });

  test("clicking an entry on another sheet activates that sheet", async () => {
    const model = createModelFromGrid({});
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "A1", "=ABS(3)", "sheet2");
    await mountPanel(model);
    await click(fixture, ".o-button.primary");
    await click(fixture, ".o-perf-range-entry");
    expect(model.getters.getActiveSheetId()).toBe("sheet2");
  });

  test("do not select if the sheet disappeared", async () => {
    const model = createModelFromGrid({});
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "B1", "=ABS(3)", "sheet2");
    await mountPanel(model);
    await click(fixture, ".o-button.primary");
    expect(".o-perf-range-entry .text-muted").toHaveText("Sheet2!B1");
    deleteSheet(model, "sheet2");
    await nextTick();
    expect(".o-perf-range-entry .text-muted").toHaveText("#REF");
    await click(fixture, ".o-perf-range-entry");
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    expect(model.getters.getActiveSheetId()).toBe(model.getters.getSheetIds()[0]);
  });

  test("'Re-analyze' button is shown after profiling", async () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    expect(fixture.querySelector(".o-button.primary")).toBeNull();
    expect(".o-button:not(.primary)").toHaveText(" Re-analyze ");
  });

  test("re-analyze clears selection and re-profiles", async () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    // Select an entry
    await click(fixture, ".o-perf-range-entry");
    expect(".o-perf-entry-selected").toHaveCount(1);

    // Click re-analyze
    await click(fixture, "[data-icon='refresh']");

    // Selection is cleared
    expect(".o-perf-entry-selected").toHaveCount(0);
    // But entries are still shown (re-profiled)
    expect(".o-perf-range-entry").toHaveCount(1);
  });

  test("bar width is proportional to entry time", async () => {
    let now = 0;
    jest.spyOn(performance, "now").mockImplementation(() => {
      now += 10;
      return now;
    });
    const model = createModelFromGrid({ A1: "=SUM(1, 2)", A2: "=SUM(1, 2, 3)" });
    await mountPanel(model);
    await click(fixture, ".o-button.primary");

    const bar = fixture.querySelector(".o-perf-bar") as HTMLElement;
    expect(bar.style.width).toBe("50%");
  });
});
