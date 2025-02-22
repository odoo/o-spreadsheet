import { ComposerStore } from "../../../src/components/composer/composer/composer_store";
import { addDataValidation, setCellContent } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Data validation auto complete", () => {
  test("start with exact match, but with other proposals", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["XS", "S", "M", "L", "XL"],
      displayStyle: "arrow",
    });
    setCellContent(model, "A1", "S");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(5);
  });

  test("start with partial match displays all values", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInList",
      values: ["XS", "XL", "L"],
      displayStyle: "arrow",
    });
    setCellContent(model, "A1", "X");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(3);
  });
});
