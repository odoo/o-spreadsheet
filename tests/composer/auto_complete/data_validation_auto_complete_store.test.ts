import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { addDataValidation, setCellContent, setFormat } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Data validation auto complete", () => {
  test("start with exact match, but with other proposals", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
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
    const { store: composer, model } = makeStore(CellComposerStore);
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

  test("Cell formatted value is shown in the proposals", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    addDataValidation(model, "A1", "id", {
      type: "isValueInRange",
      values: ["B1:B2"],
      displayStyle: "arrow",
    });
    setCellContent(model, "B1", "5");
    setFormat(model, "B1", "0.00[$€]");
    setCellContent(model, "B2", "10");
    setFormat(model, "B2", "yyyy-mm-dd");

    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(2);
    expect(proposals).toMatchObject([
      {
        text: "5",
        htmlContent: [{ value: "5.00€" }],
        fuzzySearchKey: "5.00€",
      },
      {
        text: "10",
        htmlContent: [{ value: "1900-01-09" }],
        fuzzySearchKey: "1900-01-09",
      },
    ]);
  });
});
