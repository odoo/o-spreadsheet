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
});
