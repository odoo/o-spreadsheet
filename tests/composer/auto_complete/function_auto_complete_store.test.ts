import { ComposerStore } from "../../../src/components/composer/composer/composer_store";
import { setCellContent } from "../../test_helpers/commands_helpers";
import { makeStore } from "../../test_helpers/stores";

describe("Function auto complete", () => {
  test("start with exact match, but with other proposals", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    setCellContent(model, "A1", "=SUM");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(8);
    expect(proposals?.[0].text).toEqual("SUM");
    expect(proposals?.[1].text).toEqual("SUMIF");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=SUM(");
  });

  test("start with exact match, only get match proposal", () => {
    const { store: composer, model } = makeStore(ComposerStore);
    setCellContent(model, "A1", "=VLOOKUP");
    composer.startEdition();
    const autoComplete = composer.autocompleteProvider;
    const proposals = autoComplete?.proposals;
    expect(proposals).toHaveLength(1);
    expect(proposals?.[0].text).toEqual("VLOOKUP");
    autoComplete?.selectProposal(proposals![0].text);
    expect(composer.currentContent).toEqual("=VLOOKUP(");
  });
});
