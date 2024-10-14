import { Model } from "../../../src";
import { createImage } from "../../test_helpers/commands_helpers";
import { simulateClick } from "../../test_helpers/dom_helper";
import { mountSpreadsheet } from "../../test_helpers/helpers";

describe("Image component", () => {
  test("Can reset the image size", async () => {
    const model = new Model({});
    const sheetId = model.getters.getActiveSheetId();
    createImage(model, { sheetId, figureId: "test", size: { width: 200, height: 200 } });
    await mountSpreadsheet({ model });
    model.dispatch("UPDATE_FIGURE", {
      sheetId,
      id: "test",
      x: 0,
      y: 0,
      width: 300,
      height: 300,
    });
    await simulateClick(".o-figure");
    await simulateClick(".o-figure-menu-item");
    await simulateClick(".o-menu div[data-name='reset_size']");
    expect(model.getters.getFigure(sheetId, "test")).toMatchObject({ width: 200, height: 200 });
  });
});
