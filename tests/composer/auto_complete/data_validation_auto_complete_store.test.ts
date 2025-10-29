import { GRAY_200 } from "@odoo/o-spreadsheet-engine/constants";
import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { addDataValidation, setCellContent } from "../../test_helpers/commands_helpers";
import { nextTick } from "../../test_helpers/helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Data validation auto complete", () => {
  test("start with exact match, but with other proposals", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["XS", "S", "M", "L", "XL"],
      displayStyle: "arrow",
    });
    setCellContent(model, "A1", "S");
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(5);
  });

  test("start with partial match displays all values", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["XS", "XL", "L"],
      displayStyle: "arrow",
    });
    setCellContent(model, "A1", "X");
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals).toHaveLength(3);
  });

  test("value in list set rounded chip and color", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["hello", "world"],
      colors: { world: "#B6D7A8" },
      displayStyle: "chip",
    });
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals.map((p) => p.htmlContent)).toEqual([
      [
        {
          backgroundColor: GRAY_200, // default color
          classes: ["badge rounded-pill fs-6 fw-normal w-100 mt-1 text-start"],
          color: "#2C3649",
          value: "hello",
        },
      ],
      [
        {
          backgroundColor: "#B6D7A8",
          classes: ["badge rounded-pill fs-6 fw-normal w-100 mt-1 text-start"],
          color: "#234F11",
          value: "world",
        },
      ],
    ]);
  });

  test("value in range set rounded chip and color", async () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInRange",
      values: ["B2:B4"],
      colors: { world: "#B6D7A8" },
      displayStyle: "chip",
    });
    setCellContent(model, "B2", "hello");
    setCellContent(model, "B3", "world");
    composer.startEdition();
    await nextTick();
    const proposals = composer.autoCompleteProposals;
    expect(proposals.map((p) => p.htmlContent)).toEqual([
      [
        {
          backgroundColor: GRAY_200, // default color
          classes: ["badge rounded-pill fs-6 fw-normal w-100 mt-1 text-start"],
          color: "#2C3649",
          value: "hello",
        },
      ],
      [
        {
          backgroundColor: "#B6D7A8",
          classes: ["badge rounded-pill fs-6 fw-normal w-100 mt-1 text-start"],
          color: "#234F11",
          value: "world",
        },
      ],
    ]);
  });
});
