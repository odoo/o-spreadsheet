import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { selectCell, setCellContent } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Function auto complete", () => {
  test("start with exact match, but with other proposals", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=SUM");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(10);
    expect(proposals?.[0].text).toEqual("SUM");
    expect(proposals?.[1].text).toEqual("SUMIF");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=SUM(");
  });

  test("function auto complete uses fuzzy search", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=VOK");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(1);
    expect(proposals?.[0].text).toBe("VLOOKUP");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=VLOOKUP(");
  });

  test("reselect cell with existing content shows correct autocomplete proposals", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=VLOOKUP");
    selectCell(model, "A1");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(1);
    expect(proposals?.[0].text).toBe("VLOOKUP");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=VLOOKUP(");
  });
});
