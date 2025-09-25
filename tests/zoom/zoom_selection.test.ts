import { Model } from "../../src/model";
import { setCellContent } from "../test_helpers/commands_helpers";
import { clickCell, clickHeader } from "../test_helpers/dom_helper";
import { getSelectionAnchorCellXc } from "../test_helpers/getters_helpers";
import { mockChart, mountSpreadsheet } from "../test_helpers/helpers";

jest.mock("../../src/helpers/figures/images/image_provider", () =>
  require("../__mocks__/mock_image_provider")
);

let fixture: HTMLElement;
let model: Model;

jest.useFakeTimers();
mockChart();

describe.each([75, 100, 125, 150])("Zoom tests selection %s", (zoomValue) => {
  const zoom = zoomValue / 100;
  beforeEach(async () => {
    ({ model, fixture } = await mountSpreadsheet());
    model.dispatch("SET_ZOOM", { zoom });
  });
  test("can render a sheet with zoom", async () => {
    expect(fixture.querySelector(".o-grid-overlay")).not.toBeNull();
  });

  test("can click on a cell to select it", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    await clickCell(model, "C8", {}, { clickInMiddle: true });
    expect(getSelectionAnchorCellXc(model)).toBe("C8");
  });

  test("can select a COL header", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    await clickHeader(model, "COL", 2, {});
    expect(getSelectionAnchorCellXc(model)).toBe("C1");
  });

  test("can select a ROW header", async () => {
    setCellContent(model, "B2", "b2");
    setCellContent(model, "B3", "b3");
    await clickHeader(model, "ROW", 2, {});
    expect(getSelectionAnchorCellXc(model)).toBe("A4");
  });
});
