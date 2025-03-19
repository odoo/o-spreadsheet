import { CellComposerStore } from "../../../src/components/composer/composer/cell_composer_store";
import { setCellContent } from "../../test_helpers/commands_helpers";
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

  test("starting with unknown character should stop autocomplete even when adding a valid character", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=éSUM");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toBeUndefined();
  });

  test("adding an unknown character in the middle of a function should stop autocomplete", () => {
    const { store: composer, model } = makeStore(CellComposerStore);
    setCellContent(model, "A1", "=SéSUM");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toBeUndefined();
  });
});
