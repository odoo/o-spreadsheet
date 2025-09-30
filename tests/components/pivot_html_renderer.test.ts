import { UID } from "@odoo/o-spreadsheet-engine";
import { Model } from "../../src";
import { PivotHTMLRenderer } from "../../src/components/pivot_html_renderer/pivot_html_renderer";
import { createSheet } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { createModelFromGrid, mountComponent } from "../test_helpers/helpers";
import { addPivot } from "../test_helpers/pivot_helpers";

let fixture: HTMLElement;

async function mountPivotHtmlRenderer(
  model: Model,
  pivotId: UID,
  onCellClicked: PivotHTMLRenderer["props"]["onCellClicked"] = () => {}
) {
  const props = {
    pivotId,
    onCellClicked,
  };
  model.dispatch("PIVOT_START_PRESENCE_TRACKING", { pivotId });
  model.dispatch("EVALUATE_CELLS");
  ({ fixture } = await mountComponent(PivotHTMLRenderer, { env: { model }, props }));
}

describe("Pivot HTML Renderer", () => {
  test("Rendering a simple pivot table", async () => {
    // prettier-ignore
    const grid = {
      A1: "Name",  B1: "Age", C1: "Score",
      A2: "Alice", B2: "25",  C2: "90",
      A3: "Bob",   B3: "30",  C3: "85",
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Name" }],
      measures: [{ id: "Score", fieldName: "Score", aggregator: "count" }],
    });

    await mountPivotHtmlRenderer(model, model.getters.getPivotIds()[0]);
    expect(fixture).toMatchSnapshot();
  });

  test("Pivot with all formula on sheet", async () => {
    // prettier-ignore
    const grid = {
      A1: "Name",                            B1: "Age",                                    C1: "Score",
      A2: "Alice",                           B2: "25",                                     C2: "90",
      A3: "Bob",                             B3: "30",                                     C3: "85",

      A5: "",                                B5: "=PIVOT.HEADER(1)",
      A6: "",                                B6: `=PIVOT.HEADER(1,"measure","Score")`,
      A7: `=PIVOT.HEADER(1,"Name","Alice")`, B7: `=PIVOT.VALUE(1,"Score","Name","Alice")`,
      A8: `=PIVOT.HEADER(1,"Name","Bob")`,   B8: `=PIVOT.VALUE(1,"Score","Name","Bob")`,
      A9: "=PIVOT.HEADER(1)",                B9: `=PIVOT.VALUE(1,"Score")`,
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Name" }],
      measures: [{ id: "Score", fieldName: "Score", aggregator: "count" }],
    });
    await mountPivotHtmlRenderer(model, model.getters.getPivotIds()[0]);
    expect(fixture.querySelectorAll(".o_missing_value")).toHaveLength(0);
    await click(fixture, "input[type=checkbox]");
    expect(fixture.querySelector("table")).toBeNull();
    expect(fixture.querySelector(".alert-info")?.innerHTML).toEqual(
      "This pivot has no cell missing on this sheet"
    );
  });

  test("Pivot with all formula on another sheet", async () => {
    // prettier-ignore
    const grid = {
      A1: "Name",                            B1: "Age",                                    C1: "Score",
      A2: "Alice",                           B2: "25",                                     C2: "90",
      A3: "Bob",                             B3: "30",                                     C3: "85",

      A5: "",                                B5: "=PIVOT.HEADER(1)",
      A6: "",                                B6: `=PIVOT.HEADER(1,"measure","Score")`,
      A7: `=PIVOT.HEADER(1,"Name","Alice")`, B7: `=PIVOT.VALUE(1,"Score","Name","Alice")`,
      A8: `=PIVOT.HEADER(1,"Name","Bob")`,   B8: `=PIVOT.VALUE(1,"Score","Name","Bob")`,
      A9: "=PIVOT.HEADER(1)",                B9: `=PIVOT.VALUE(1,"Score")`,
    };
    const model = createModelFromGrid(grid);
    addPivot(model, "A1:C3", {
      rows: [{ fieldName: "Name" }],
      measures: [{ id: "Score", fieldName: "Score", aggregator: "count" }],
    });
    createSheet(model, { activate: true });
    await mountPivotHtmlRenderer(model, model.getters.getPivotIds()[0]);
    expect(fixture.querySelectorAll(".o_missing_value")).toHaveLength(8);
  });
});
